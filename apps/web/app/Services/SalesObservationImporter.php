<?php

namespace App\Services;

use App\Models\SalesObservation;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * @phpstan-type Observation array{branch_id: int, product_id: int, interval_start: string, interval_minutes: int, quantity_pieces: int|null, revenue_cents: int|null, status: string, source_reference: string}
 * @phpstan-type ImportError array{row: int, message: string}
 * @phpstan-type ImportResult array{valid: bool, committed: bool, rows: int, inserted: int, unchanged: int, status_counts: array<string, int>, errors: list<ImportError>, error_count: int}
 */
class SalesObservationImporter
{
    public const MAX_BYTES = 10 * 1024 * 1024;

    public const MAX_ROWS = 100_000;

    public const MAX_QUANTITY = 1_000_000_000;

    public const MAX_REVENUE = 9_000_000_000_000;

    public const HEADER = ['source_reference', 'branch_code', 'product_sku', 'interval_start', 'interval_minutes', 'quantity_pieces', 'revenue_cents', 'status'];

    /**
     * Validate the complete file and database conflicts before inserting anything.
     * `inserted` is the new-row count (planned during a dry-run).
     * Historical imports never write to live sales, payments or stock tables.
     *
     * @return ImportResult
     */
    public function import(string $file, bool $commit = false): array
    {
        $result = $this->emptyResult();
        if (! is_file($file) || ! is_readable($file)) {
            $this->error($result, 0, 'Choose a readable local CSV file.');

            return $result;
        }

        $contents = @file_get_contents($file, false, null, 0, self::MAX_BYTES + 1);
        if ($contents === false || strlen($contents) > self::MAX_BYTES) {
            $this->error($result, 0, 'The CSV must be no larger than 10 MiB.');

            return $result;
        }
        if (preg_match('//u', $contents) !== 1 || str_contains($contents, "\0")) {
            $this->error($result, 0, 'The CSV must be valid UTF-8 text without null bytes.');

            return $result;
        }
        if (str_starts_with($contents, "\xEF\xBB\xBF")) {
            $contents = substr($contents, 3);
        }

        $stream = fopen('php://temp', 'w+');
        if ($stream === false) {
            $this->error($result, 0, 'The CSV could not be opened for validation.');

            return $result;
        }
        fwrite($stream, $contents);
        rewind($stream);
        $header = fgetcsv($stream, null, ',', '"', '');
        if ($header !== self::HEADER) {
            fclose($stream);
            $this->error($result, 1, 'The CSV header must match the documented eight columns, in order.');

            return $result;
        }

        /** @var array<string, array{id: int, timezone: string}> $branches */
        $branches = [];
        foreach (DB::table('branches')->get(['id', 'code', 'timezone']) as $branch) {
            $branches[$branch->code] = ['id' => (int) $branch->id, 'timezone' => $branch->timezone];
        }
        /** @var array<string, int> $products */
        $products = [];
        foreach (DB::table('products')->get(['id', 'sku']) as $product) {
            $products[$product->sku] = (int) $product->id;
        }

        /** @var list<Observation> $rows */
        $rows = [];
        /** @var list<int> $rowNumbers */
        $rowNumbers = [];
        /** @var array<string, int> $references */
        $references = [];
        /** @var array<string, int> $intervals */
        $intervals = [];
        $line = 1 + substr_count(substr($contents, 0, (int) ftell($stream)), "\n");

        while (! feof($stream)) {
            $offset = (int) ftell($stream);
            $fields = fgetcsv($stream, null, ',', '"', '');
            if ($fields === false) {
                break;
            }
            $recordLine = $line;
            $line += substr_count(substr($contents, $offset, (int) ftell($stream) - $offset), "\n");
            if ($fields === [null]) {
                continue;
            }
            $result['rows']++;
            if ($result['rows'] > self::MAX_ROWS) {
                $this->error($result, $recordLine, 'The CSV must contain no more than 100,000 observation rows.');
                break;
            }
            if (count($fields) !== count(self::HEADER) || in_array(null, $fields, true)) {
                $this->error($result, $recordLine, 'Each observation must contain exactly eight fields.');

                continue;
            }
            /** @var list<string> $fields */
            $data = $this->validateRow($fields, $branches, $products, $recordLine, $result);
            if ($data === null) {
                continue;
            }
            $result['status_counts'][$data['status']]++;
            $reference = $this->referenceKey($data['branch_id'], $data['source_reference']);
            $interval = $this->intervalKey($data);
            if (isset($references[$reference])) {
                if ($rows[$references[$reference]] === $data) {
                    $result['unchanged']++;
                } else {
                    $this->error($result, $recordLine, 'The source reference is repeated with a changed payload.');
                }

                continue;
            }
            if (isset($intervals[$interval])) {
                $this->error($result, $recordLine, 'The interval is repeated with a different source reference.');

                continue;
            }
            $references[$reference] = count($rows);
            $intervals[$interval] = count($rows);
            $rows[] = $data;
            $rowNumbers[] = $recordLine;
        }
        fclose($stream);
        unset($contents, $references, $intervals);
        if ($result['rows'] === 0) {
            $this->error($result, 2, 'The CSV must contain at least one observation.');
        }
        if ($result['error_count'] !== 0) {
            return $result;
        }

        try {
            return DB::transaction(function () use ($rows, $rowNumbers, $commit, $result): array {
                $pending = [];
                for ($offset = 0; $offset < count($rows); $offset += 200) {
                    $chunk = array_slice($rows, $offset, 200);
                    $existingReferences = [];
                    $existingIntervals = [];
                    $branchIds = array_values(array_unique(array_column($chunk, 'branch_id')));
                    $sourceReferences = array_column($chunk, 'source_reference');
                    foreach (SalesObservation::query()->whereIn('branch_id', $branchIds)->whereIn('source_reference', $sourceReferences)->get() as $existing) {
                        $existingReferences[$this->referenceKey($existing->branch_id, $existing->source_reference)] = $existing;
                    }
                    foreach (SalesObservation::query()->where(function (Builder $query) use ($chunk): void {
                        foreach ($chunk as $row) {
                            $query->orWhere(function (Builder $interval) use ($row): void {
                                $interval->where('branch_id', $row['branch_id'])
                                    ->where('product_id', $row['product_id'])
                                    ->where('interval_start', $row['interval_start'])
                                    ->where('interval_minutes', $row['interval_minutes']);
                            });
                        }
                    })->get() as $existing) {
                        $existingIntervals[$this->intervalKey([
                            'branch_id' => $existing->branch_id,
                            'product_id' => $existing->product_id,
                            'interval_start' => $existing->interval_start->utc()->format('Y-m-d H:i:s'),
                            'interval_minutes' => $existing->interval_minutes,
                        ])] = $existing;
                    }

                    foreach ($chunk as $index => $row) {
                        $existing = $existingReferences[$this->referenceKey($row['branch_id'], $row['source_reference'])] ?? null;
                        if ($existing !== null) {
                            if ($this->samePayload($existing, $row)) {
                                $result['unchanged']++;
                            } else {
                                $this->error($result, $rowNumbers[$offset + $index], 'The source reference already exists with a different payload.');
                            }
                        } elseif (isset($existingIntervals[$this->intervalKey($row)])) {
                            $this->error($result, $rowNumbers[$offset + $index], 'The interval already exists with a different source reference.');
                        } else {
                            $pending[] = $offset + $index;
                        }
                    }
                }
                if ($result['error_count'] !== 0) {
                    return $result;
                }
                $result['valid'] = true;
                $result['inserted'] = count($pending);
                if ($commit) {
                    $now = now('UTC')->format('Y-m-d H:i:s');
                    foreach (array_chunk($pending, 200) as $indices) {
                        $inserts = [];
                        foreach ($indices as $index) {
                            $inserts[] = [...$rows[$index], 'created_at' => $now, 'updated_at' => $now];
                        }
                        DB::table('sales_observations')->insert($inserts);
                    }
                    $result['committed'] = true;
                }

                return $result;
            });
        } catch (QueryException) {
            $result['valid'] = false;
            $result['inserted'] = 0;
            $result['committed'] = false;
            $this->error($result, 0, 'Import could not be completed. Verify migrations and retry the dry-run; no observations were imported.');

            return $result;
        }
    }

    /**
     * @param  list<string>  $fields
     * @param  array<string, array{id: int, timezone: string}>  $branches
     * @param  array<string, int>  $products
     * @param  ImportResult  $result
     * @return Observation|null
     */
    private function validateRow(array $fields, array $branches, array $products, int $line, array &$result): ?array
    {
        [$reference, $branchCode, $sku, $timestamp, $minutes, $quantity, $revenue, $status] = $fields;
        $before = $result['error_count'];
        if ($reference === '' || $reference !== trim($reference) || mb_strlen($reference) > 120 || preg_match('/[\x00-\x1F\x7F-\x9F]/u', $reference) === 1) {
            $this->error($result, $line, 'Source reference must be 1–120 characters without surrounding whitespace or control characters.');
        }
        $branch = $branches[$branchCode] ?? null;
        $productId = $products[$sku] ?? null;
        if ($branch === null) {
            $this->error($result, $line, 'Branch code is not recognized.');
        }
        if ($productId === null) {
            $this->error($result, $line, 'Product SKU is not recognized.');
        }
        if (! in_array($minutes, ['60', '1440'], true)) {
            $this->error($result, $line, 'Interval minutes must be exactly 60 or 1440.');
        }
        if (! in_array($status, ['observed', 'closed', 'stockout', 'missing'], true)) {
            $this->error($result, $line, 'Status must be observed, closed, stockout or missing.');
        }
        $pieces = $quantity === '' ? null : $this->nonnegativeInteger($quantity, self::MAX_QUANTITY);
        $cents = $revenue === '' ? null : $this->nonnegativeInteger($revenue, self::MAX_REVENUE);
        if ($quantity !== '' && $pieces === null) {
            $this->error($result, $line, 'Quantity must be a whole number from 0 to 1,000,000,000 pieces.');
        }
        if ($revenue !== '' && $cents === null) {
            $this->error($result, $line, 'Revenue must be whole cents from 0 to 9,000,000,000,000, or blank.');
        }
        if (in_array($status, ['observed', 'stockout'], true) && $quantity === '') {
            $this->error($result, $line, 'Observed and stockout rows require a recorded quantity, including explicit zero.');
        }
        if ($status === 'missing' && ($quantity !== '' || $revenue !== '')) {
            $this->error($result, $line, 'Missing rows must leave quantity and revenue blank.');
        }
        if ($status === 'closed' && ($pieces !== 0 || ($cents !== null && $cents !== 0))) {
            $this->error($result, $line, 'Closed rows require zero quantity and zero or blank revenue.');
        }

        $date = $this->parseTimestamp($timestamp);
        if ($date === null) {
            $this->error($result, $line, 'Interval start must be a valid ISO timestamp with seconds and an explicit UTC offset or Z.');
        } elseif ($branch !== null && in_array($minutes, ['60', '1440'], true)) {
            try {
                static $timezoneIds = null;
                $timezoneIds ??= array_fill_keys(DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true);
                if (! isset($timezoneIds[$branch['timezone']])) {
                    throw new \InvalidArgumentException('An IANA timezone is required.');
                }
                $local = $date->setTimezone(new DateTimeZone($branch['timezone']));
                if (($minutes === '1440' && $local->format('H:i:s') !== '00:00:00')
                    || ($minutes === '60' && $local->format('i:s') !== '00:00')) {
                    $this->error($result, $line, 'Interval start must align to business midnight (daily) or the business hour (hourly).');
                }
            } catch (Throwable) {
                $this->error($result, $line, 'The branch needs a valid business timezone before importing.');
            }
        }
        if ($result['error_count'] !== $before || $branch === null || $productId === null || $date === null) {
            return null;
        }

        return [
            'branch_id' => $branch['id'],
            'product_id' => $productId,
            'interval_start' => $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'interval_minutes' => (int) $minutes,
            'quantity_pieces' => $pieces,
            'revenue_cents' => $cents,
            'status' => $status,
            'source_reference' => $reference,
        ];
    }

    private function nonnegativeInteger(string $value, int $maximum): ?int
    {
        if (preg_match('/\A(?:0|[1-9][0-9]*)\z/', $value) !== 1 || strlen($value) > strlen((string) $maximum)) {
            return null;
        }
        if (strlen($value) === strlen((string) $maximum) && strcmp($value, (string) $maximum) > 0) {
            return null;
        }

        return (int) $value;
    }

    private function parseTimestamp(string $value): ?DateTimeImmutable
    {
        if (preg_match('/\A(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:Z|[+-](?:0[0-9]|1[0-4]):[0-5][0-9])\z/', $value) !== 1) {
            return null;
        }
        $normalized = str_ends_with($value, 'Z') ? substr($value, 0, -1).'+00:00' : $value;
        if (preg_match('/[+-]14:(?!00)[0-9]{2}\z/', $normalized) === 1) {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:sP', $normalized);
        $errors = DateTimeImmutable::getLastErrors();
        if ($date === false || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) || $date->format('Y-m-d\TH:i:sP') !== $normalized) {
            return null;
        }
        $utcYear = (int) $date->setTimezone(new DateTimeZone('UTC'))->format('Y');

        return $utcYear >= 1 && $utcYear <= 9999 ? $date : null;
    }

    private function referenceKey(int $branchId, string $reference): string
    {
        return $branchId.'|'.$reference;
    }

    /** @param array{branch_id: int, product_id: int, interval_start: string, interval_minutes: int} $row */
    private function intervalKey(array $row): string
    {
        return implode('|', [$row['branch_id'], $row['product_id'], $row['interval_start'], $row['interval_minutes']]);
    }

    /** @param Observation $row */
    private function samePayload(SalesObservation $existing, array $row): bool
    {
        return $existing->branch_id === $row['branch_id']
            && $existing->product_id === $row['product_id']
            && $existing->interval_start->utc()->format('Y-m-d H:i:s') === $row['interval_start']
            && $existing->interval_minutes === $row['interval_minutes']
            && $existing->quantity_pieces === $row['quantity_pieces']
            && $existing->revenue_cents === $row['revenue_cents']
            && $existing->status === $row['status']
            && $existing->source_reference === $row['source_reference'];
    }

    /** @return ImportResult */
    private function emptyResult(): array
    {
        return [
            'valid' => false, 'committed' => false, 'rows' => 0, 'inserted' => 0,
            'unchanged' => 0, 'status_counts' => ['observed' => 0, 'closed' => 0, 'stockout' => 0, 'missing' => 0],
            'errors' => [], 'error_count' => 0,
        ];
    }

    /** @param ImportResult $result */
    private function error(array &$result, int $row, string $message): void
    {
        $result['error_count']++;
        if (count($result['errors']) < 100) {
            $result['errors'][] = ['row' => $row, 'message' => $message];
        }
    }
}
