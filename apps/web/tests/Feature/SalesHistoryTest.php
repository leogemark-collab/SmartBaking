<?php

namespace Tests\Feature;

use App\Services\SalesObservationImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SalesHistoryTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> */
    private array $temporaryFiles = [];

    private int $branchId;

    private int $productId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->branchId = DB::table('branches')->insertGetId([
            'code' => 'SAMPLE-CENTRAL', 'name' => 'Synthetic test branch',
            'timezone' => 'Asia/Manila', 'can_produce' => true, 'active' => true,
        ]);
        $this->productId = DB::table('products')->insertGetId([
            'sku' => 'SAMPLE-PAN-001', 'name' => 'Synthetic bread', 'category' => 'Bread',
            'price_cents' => 500, 'active' => true,
        ]);
        DB::table('product_stocks')->insert([
            'branch_id' => $this->branchId, 'product_id' => $this->productId,
            'quantity_pieces' => 123,
        ]);
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        parent::tearDown();
    }

    public function test_dry_run_commit_and_canonical_reimport_do_not_change_operational_stock_or_sales(): void
    {
        $file = $this->csv([$this->row()]);
        $importer = app(SalesObservationImporter::class);
        $preview = $importer->import($file);
        $this->assertTrue($preview['valid']);
        $this->assertFalse($preview['committed']);
        $this->assertSame(1, $preview['inserted']);
        $this->assertDatabaseCount('sales_observations', 0);

        $committed = $importer->import($file, true);
        $this->assertTrue($committed['committed']);
        $this->assertDatabaseHas('sales_observations', [
            'interval_start' => '2026-10-31 16:00:00', 'quantity_pieces' => 100,
            'revenue_cents' => 50000, 'status' => 'observed',
        ]);
        $equivalent = $this->csv([$this->row(['interval_start' => '2026-10-31T16:00:00Z'])]);
        $reimport = $importer->import($equivalent, true);
        $this->assertTrue($reimport['valid']);
        $this->assertSame(0, $reimport['inserted']);
        $this->assertSame(1, $reimport['unchanged']);
        $this->assertDatabaseCount('sales_observations', 1);
        $this->assertDatabaseHas('product_stocks', ['quantity_pieces' => 123]);
        foreach (['sales', 'sale_items', 'stock_movements', 'stock_receipts', 'production_batches'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_missing_stockout_closed_and_observed_zero_are_preserved_distinctly(): void
    {
        $file = $this->csv([
            $this->row(['source_reference' => 'observed-zero', 'quantity_pieces' => '0', 'revenue_cents' => '0']),
            $this->row(['source_reference' => 'missing-day', 'interval_start' => '2026-11-02T00:00:00+08:00', 'quantity_pieces' => '', 'revenue_cents' => '', 'status' => 'missing']),
            $this->row(['source_reference' => 'censored-day', 'interval_start' => '2026-11-03T00:00:00+08:00', 'quantity_pieces' => '60', 'status' => 'stockout']),
            $this->row(['source_reference' => 'closed-day', 'interval_start' => '2026-11-04T00:00:00+08:00', 'quantity_pieces' => '0', 'revenue_cents' => '', 'status' => 'closed']),
        ]);
        $result = app(SalesObservationImporter::class)->import($file, true);
        $this->assertTrue($result['valid']);
        $this->assertSame(['observed' => 1, 'closed' => 1, 'stockout' => 1, 'missing' => 1], $result['status_counts']);
        $this->assertDatabaseHas('sales_observations', ['status' => 'missing', 'quantity_pieces' => null, 'revenue_cents' => null]);
        $this->assertDatabaseHas('sales_observations', ['status' => 'stockout', 'quantity_pieces' => 60]);
        $this->assertDatabaseHas('sales_observations', ['status' => 'observed', 'quantity_pieces' => 0]);
    }

    public function test_a_late_invalid_row_rejects_the_complete_file_with_a_row_number(): void
    {
        $file = $this->csv([
            $this->row(),
            $this->row(['source_reference' => 'bad-row', 'interval_start' => '2026-11-02T00:00:00+08:00', 'quantity_pieces' => '1.5']),
        ]);
        $result = app(SalesObservationImporter::class)->import($file, true);
        $this->assertFalse($result['valid']);
        $this->assertSame(3, $result['errors'][0]['row']);
        $this->assertDatabaseCount('sales_observations', 0);
    }

    /** @param array<string, string> $changes */
    #[DataProvider('invalidRows')]
    public function test_invalid_values_and_semantics_are_rejected(array $changes): void
    {
        $result = app(SalesObservationImporter::class)->import($this->csv([$this->row($changes)]), true);
        $this->assertFalse($result['valid']);
        $this->assertGreaterThan(0, $result['error_count']);
        $this->assertSame(2, $result['errors'][0]['row']);
        $this->assertDatabaseCount('sales_observations', 0);
    }

    /** @return array<string, array{array<string, string>}> */
    public static function invalidRows(): array
    {
        return [
            'unknown branch' => [['branch_code' => 'NO-SUCH-BRANCH']],
            'unknown product' => [['product_sku' => 'NO-SUCH-SKU']],
            'negative pieces' => [['quantity_pieces' => '-1']],
            'overflow pieces' => [['quantity_pieces' => '1000000001']],
            'scientific pieces' => [['quantity_pieces' => '1e3']],
            'overflow cents' => [['revenue_cents' => '9000000000001']],
            'fractional cents' => [['revenue_cents' => '50.5']],
            'observed empty quantity' => [['quantity_pieces' => '']],
            'stockout empty quantity' => [['quantity_pieces' => '', 'status' => 'stockout']],
            'missing is not zero' => [['quantity_pieces' => '0', 'revenue_cents' => '', 'status' => 'missing']],
            'closed cannot sell' => [['quantity_pieces' => '1', 'revenue_cents' => '0', 'status' => 'closed']],
            'no offset' => [['interval_start' => '2026-11-01T00:00:00']],
            'invalid calendar day' => [['interval_start' => '2026-02-30T00:00:00+08:00']],
            'not local midnight' => [['interval_start' => '2026-11-01T00:00:00Z']],
            'not hour aligned' => [['interval_start' => '2026-11-01T05:30:00+08:00', 'interval_minutes' => '60']],
            'bad interval' => [['interval_minutes' => '30']],
            'unknown status' => [['status' => 'estimated']],
            'no reference' => [['source_reference' => '']],
        ];
    }

    public function test_changed_source_or_interval_conflicts_are_rejected_without_partial_insert(): void
    {
        $importer = app(SalesObservationImporter::class);
        $this->assertTrue($importer->import($this->csv([$this->row()]), true)['valid']);
        $changed = $this->csv([
            $this->row(['source_reference' => 'new-day', 'interval_start' => '2026-11-02T00:00:00+08:00']),
            $this->row(['quantity_pieces' => '101']),
        ]);
        $this->assertFalse($importer->import($changed, true)['valid']);
        $sameInterval = $this->csv([$this->row(['source_reference' => 'different-reference'])]);
        $this->assertFalse($importer->import($sameInterval, true)['valid']);
        $this->assertDatabaseCount('sales_observations', 1);
        $this->assertDatabaseHas('sales_observations', ['quantity_pieces' => 100]);
    }

    public function test_identical_file_duplicates_are_noops_but_changed_duplicates_fail(): void
    {
        $importer = app(SalesObservationImporter::class);
        $exact = $importer->import($this->csv([$this->row(), $this->row()]), true);
        $this->assertTrue($exact['valid']);
        $this->assertSame(1, $exact['inserted']);
        $this->assertSame(1, $exact['unchanged']);
        $changed = $importer->import($this->csv([$this->row(), $this->row(['quantity_pieces' => '99'])]), true);
        $this->assertFalse($changed['valid']);
        $this->assertDatabaseCount('sales_observations', 1);
    }

    public function test_utf8_bom_is_allowed_and_bad_header_or_invalid_utf8_is_refused(): void
    {
        $importer = app(SalesObservationImporter::class);
        $file = $this->csv([$this->row()]);
        file_put_contents($file, "\xEF\xBB\xBF".file_get_contents($file));
        $this->assertTrue($importer->import($file)['valid']);
        file_put_contents($file, "wrong,header\n");
        $this->assertFalse($importer->import($file)['valid']);
        file_put_contents($file, "\xFF\xFE");
        $this->assertFalse($importer->import($file)['valid']);
    }

    public function test_cli_requires_commit_for_writes(): void
    {
        $file = $this->csv([$this->row()]);
        $this->artisan('smartbaking:import-sales', ['file' => $file])->expectsOutputToContain('Dry-run passed')->assertSuccessful();
        $this->assertDatabaseCount('sales_observations', 0);
        $this->artisan('smartbaking:import-sales', ['file' => $file, '--commit' => true])->assertSuccessful();
        $this->assertDatabaseCount('sales_observations', 1);
    }

    public function test_oversized_files_are_refused_before_parsing_or_inserting(): void
    {
        $file = $this->csv([$this->row()]);
        $stream = fopen($file, 'r+');
        $this->assertNotFalse($stream);
        ftruncate($stream, SalesObservationImporter::MAX_BYTES + 1);
        fclose($stream);
        $result = app(SalesObservationImporter::class)->import($file, true);
        $this->assertFalse($result['valid']);
        $this->assertSame(0, $result['errors'][0]['row']);
        $this->assertDatabaseCount('sales_observations', 0);
    }

    public function test_numeric_timezone_offsets_are_not_accepted_as_business_timezone_names(): void
    {
        DB::table('branches')->where('id', $this->branchId)->update(['timezone' => '+08:00']);
        $result = app(SalesObservationImporter::class)->import($this->csv([$this->row()]), true);
        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('timezone', $result['errors'][0]['message']);
        $this->assertDatabaseCount('sales_observations', 0);
    }

    public function test_export_keeps_statuses_utc_dates_and_frequency_without_fabricating_gaps(): void
    {
        $file = $this->csv([
            $this->row(),
            $this->row(['source_reference' => 'missing', 'interval_start' => '2026-11-02T00:00:00+08:00', 'quantity_pieces' => '', 'revenue_cents' => '', 'status' => 'missing']),
            $this->row(['source_reference' => 'censored', 'interval_start' => '2026-11-04T00:00:00+08:00', 'status' => 'stockout']),
            $this->row(['source_reference' => 'hourly', 'interval_start' => '2026-11-01T05:00:00+08:00', 'interval_minutes' => '60']),
        ]);
        $this->assertTrue(app(SalesObservationImporter::class)->import($file, true)['valid']);
        $output = $this->exportPath();
        $exit = Artisan::call('smartbaking:export-dataset', [
            'branch_code' => 'SAMPLE-CENTRAL', 'product_sku' => 'SAMPLE-PAN-001',
            '--from' => '2026-11-01', '--to' => '2026-11-04', '--output' => $output,
        ]);
        $console = Artisan::output();
        $this->assertSame(0, $exit, $console);
        $dataset = json_decode(file_get_contents($output), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('1.0', $dataset['schema_version']);
        $this->assertSame('Asia/Manila', $dataset['business_timezone']);
        $this->assertSame('daily', $dataset['frequency']);
        $this->assertCount(3, $dataset['observations']);
        $this->assertSame('2026-10-31T16:00:00Z', $dataset['observations'][0]['timestamp']);
        $this->assertNull($dataset['observations'][1]['quantity']);
        $this->assertSame('missing', $dataset['observations'][1]['status']);
        $this->assertSame('stockout', $dataset['observations'][2]['status']);
        $this->assertStringContainsString('unrecorded gaps: 1', $console);
    }

    public function test_export_requires_an_explicit_private_output_and_refuses_overwrite(): void
    {
        $arguments = ['branch_code' => 'SAMPLE-CENTRAL', 'product_sku' => 'SAMPLE-PAN-001', '--from' => '2026-11-01', '--to' => '2026-11-01'];
        $this->assertSame(1, Artisan::call('smartbaking:export-dataset', $arguments));
        $outside = base_path('storage/framework/refused-'.bin2hex(random_bytes(4)).'.json');
        $this->assertSame(1, Artisan::call('smartbaking:export-dataset', [...$arguments, '--output' => $outside]));
        $this->assertFileDoesNotExist($outside);
        $output = $this->exportPath();
        $this->assertSame(0, Artisan::call('smartbaking:export-dataset', [...$arguments, '--output' => $output]));
        $before = file_get_contents($output);
        $this->assertSame(1, Artisan::call('smartbaking:export-dataset', [...$arguments, '--output' => $output]));
        $this->assertSame($before, file_get_contents($output));
        $this->assertDatabaseCount('sales_observations', 0);
    }

    /** @param array<string, string> $changes @return array<string, string> */
    private function row(array $changes = []): array
    {
        return [...[
            'source_reference' => 'synthetic-day-1', 'branch_code' => 'SAMPLE-CENTRAL',
            'product_sku' => 'SAMPLE-PAN-001', 'interval_start' => '2026-11-01T00:00:00+08:00',
            'interval_minutes' => '1440', 'quantity_pieces' => '100',
            'revenue_cents' => '50000', 'status' => 'observed',
        ], ...$changes];
    }

    /** @param list<array<string, string>> $rows */
    private function csv(array $rows): string
    {
        $path = tempnam(sys_get_temp_dir(), 'smartbaking-history-test-');
        $this->assertNotFalse($path);
        $this->temporaryFiles[] = $path;
        $stream = fopen($path, 'w');
        $this->assertNotFalse($stream);
        fputcsv($stream, SalesObservationImporter::HEADER, ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($stream, array_values($row), ',', '"', '');
        }
        fclose($stream);

        return $path;
    }

    private function exportPath(): string
    {
        $path = dirname(base_path(), 2).DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'exports'.DIRECTORY_SEPARATOR.'history-test-'.bin2hex(random_bytes(6)).'.json';
        $this->temporaryFiles[] = $path;

        return $path;
    }
}
