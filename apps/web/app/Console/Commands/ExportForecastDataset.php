<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Product;
use App\Models\SalesObservation;
use App\Services\SalesObservationImporter;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Console\Command;
use Throwable;

class ExportForecastDataset extends Command
{
    protected $signature = 'smartbaking:export-dataset
        {branch_code : Existing branch code}
        {product_sku : Existing product SKU}
        {--from= : Inclusive business date, YYYY-MM-DD}
        {--to= : Inclusive business date, YYYY-MM-DD}
        {--frequency=daily : daily or hourly}
        {--output= : Required JSON path inside the ignored project data/exports directory}';

    protected $description = 'Export imported historical observations only, preserving missing and censored intervals';

    public function handle(): int
    {
        $output = (string) $this->option('output');
        if ($output === '') {
            $this->error('An explicit --output path inside project data/exports is required. No data was exported.');

            return self::FAILURE;
        }
        $frequency = (string) $this->option('frequency');
        if (! in_array($frequency, ['daily', 'hourly'], true)) {
            $this->error('Frequency must be daily or hourly.');

            return self::FAILURE;
        }
        $branch = Branch::query()->where('code', (string) $this->argument('branch_code'))->first();
        $product = Product::query()->where('sku', (string) $this->argument('product_sku'))->first();
        if ($branch === null || $product === null) {
            $this->error('Choose an existing branch code and product SKU.');

            return self::FAILURE;
        }
        try {
            if (! in_array($branch->timezone, DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)) {
                throw new \InvalidArgumentException('An IANA timezone is required.');
            }
            $timezone = new DateTimeZone($branch->timezone);
        } catch (Throwable) {
            $this->error('The branch needs a valid business timezone.');

            return self::FAILURE;
        }
        $start = $this->businessDate((string) $this->option('from'), $timezone);
        $last = $this->businessDate((string) $this->option('to'), $timezone);
        if ($start === null || $last === null || $last < $start) {
            $this->error('Provide valid --from and --to dates (YYYY-MM-DD), with to on or after from.');

            return self::FAILURE;
        }
        $end = $last->modify('+1 day');
        $utc = new DateTimeZone('UTC');
        $query = SalesObservation::query()
            ->where('branch_id', $branch->id)
            ->where('product_id', $product->id)
            ->where('interval_minutes', $frequency === 'daily' ? 1440 : 60)
            ->where('interval_start', '>=', $start->setTimezone($utc)->format('Y-m-d H:i:s'))
            ->where('interval_start', '<', $end->setTimezone($utc)->format('Y-m-d H:i:s'))
            ->orderBy('interval_start');
        if ((clone $query)->count() > SalesObservationImporter::MAX_ROWS) {
            $this->error('This window exceeds 100,000 observations. Export a smaller date range.');

            return self::FAILURE;
        }
        $counts = ['observed' => 0, 'closed' => 0, 'stockout' => 0, 'missing' => 0];
        $metadata = [
            'schema_version' => '1.0',
            'branch_code' => $branch->code,
            'product_sku' => $product->sku,
            'business_timezone' => $branch->timezone,
            'frequency' => $frequency,
            'unit' => 'pieces',
        ];
        $destination = $this->exportDestination($output);
        if ($destination === null) {
            $this->error('Output must be a new .json file inside the ignored project data/exports directory. Existing files and paths outside that directory are refused.');

            return self::FAILURE;
        }
        $temporary = tempnam(dirname($destination), '.smartbaking-');
        if ($temporary === false) {
            $this->error('The export directory is not writable.');

            return self::FAILURE;
        }
        $recordCount = 0;
        $stream = null;
        try {
            $stream = fopen($temporary, 'wb');
            if ($stream === false) {
                throw new \RuntimeException('Could not open the temporary export.');
            }
            $encoded = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $this->write($stream, rtrim(substr($encoded, 0, -1)).",\n  \"observations\": [\n");
            foreach ($query->limit(SalesObservationImporter::MAX_ROWS + 1)->cursor() as $record) {
                if ($recordCount >= SalesObservationImporter::MAX_ROWS) {
                    throw new \RuntimeException('The export exceeds its observation limit.');
                }
                $observation = [
                    'timestamp' => $record->interval_start->utc()->format('Y-m-d\TH:i:s\Z'),
                    'quantity' => $record->quantity_pieces,
                    'revenue_cents' => $record->revenue_cents,
                    'status' => $record->status,
                ];
                $line = json_encode($observation, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                $this->write($stream, ($recordCount > 0 ? ",\n" : '').'    '.$line);
                $recordCount++;
                $counts[$record->status]++;
            }
            $this->write($stream, "\n  ]\n}\n");
            fclose($stream);
            $stream = null;
            // Publish atomically without replacing a file created by another export
            // between validation and publication. The temporary file shares this directory.
            if (! @link($temporary, $destination)) {
                throw new \RuntimeException('Could not write the requested export.');
            }
            @chmod($destination, 0600);
        } catch (Throwable) {
            $this->error('Dataset export could not be written. No existing file was overwritten.');

            return self::FAILURE;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }
        $expected = $frequency === 'daily'
            ? (int) $start->diff($end)->days
            : (int) (($end->getTimestamp() - $start->getTimestamp()) / 3600);
        $gaps = max(0, $expected - $recordCount);
        $this->info('Historical dataset exported. No live sales were included and no observations were fabricated.');
        $this->line('Intervals: '.$recordCount.' of '.$expected.' expected; unrecorded gaps: '.$gaps.'.');
        $this->line('Observed: '.$counts['observed'].'; closed: '.$counts['closed'].'; censored stockout: '.$counts['stockout'].'; explicit missing: '.$counts['missing'].'.');
        $this->line('Coverage is descriptive only. No bakery model has been trained; validate the dataset and review gaps/closures/stockouts before experimentation.');

        return self::SUCCESS;
    }

    /** @param resource $stream */
    private function write($stream, string $contents): void
    {
        if (fwrite($stream, $contents) !== strlen($contents)) {
            throw new \RuntimeException('The complete export could not be written.');
        }
    }

    private function businessDate(string $value, DateTimeZone $timezone): ?DateTimeImmutable
    {
        if (preg_match('/\A(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}\z/', $value) !== 1) {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $timezone);
        $errors = DateTimeImmutable::getLastErrors();

        return $date !== false && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0)) && $date->format('Y-m-d') === $value ? $date : null;
    }

    /** Resolve existing symlinks before allowing a file under the ignored export root. */
    private function exportDestination(string $output): ?string
    {
        $projectRoot = dirname(base_path(), 2);
        $allowed = $projectRoot.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'exports';
        if (! is_dir($allowed) && ! @mkdir($allowed, 0700, true) && ! is_dir($allowed)) {
            return null;
        }
        $trusted = realpath($allowed);
        if ($trusted === false || strtolower(pathinfo($output, PATHINFO_EXTENSION)) !== 'json') {
            return null;
        }
        $absolute = preg_match('/\A(?:[A-Za-z]:[\\\\\/]|[\\\\\/])/', $output) === 1
            ? $output
            : getcwd().DIRECTORY_SEPARATOR.$output;
        $absolute = $this->normalizePath($absolute);
        $parent = dirname($absolute);
        $missing = [];
        while (! is_dir($parent)) {
            if ($parent === dirname($parent)) {
                return null;
            }
            array_unshift($missing, basename($parent));
            $parent = dirname($parent);
        }
        $resolved = realpath($parent);
        if ($resolved === false) {
            return null;
        }
        $candidateParent = $resolved.($missing === [] ? '' : DIRECTORY_SEPARATOR.implode(DIRECTORY_SEPARATOR, $missing));
        $candidate = $candidateParent.DIRECTORY_SEPARATOR.basename($absolute);
        $prefix = rtrim(str_replace('\\', '/', $trusted), '/').'/';
        $comparison = str_replace('\\', '/', $candidate);
        if (PHP_OS_FAMILY === 'Windows') {
            $prefix = strtolower($prefix);
            $comparison = strtolower($comparison);
        }
        if (! str_starts_with($comparison, $prefix) || file_exists($candidate) || is_link($candidate)) {
            return null;
        }
        if (! is_dir($candidateParent) && ! @mkdir($candidateParent, 0700, true) && ! is_dir($candidateParent)) {
            return null;
        }

        return $candidate;
    }

    private function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $leadingSlash = str_starts_with($path, '/');
        $parts = [];
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                if (count($parts) > 0 && ! str_ends_with($parts[array_key_last($parts)], ':')) {
                    array_pop($parts);
                }
            } else {
                $parts[] = $part;
            }
        }

        return ($leadingSlash ? DIRECTORY_SEPARATOR : '').implode(DIRECTORY_SEPARATOR, $parts);
    }
}
