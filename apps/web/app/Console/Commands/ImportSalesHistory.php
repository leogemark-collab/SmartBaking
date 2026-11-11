<?php

namespace App\Console\Commands;

use App\Services\SalesObservationImporter;
use Illuminate\Console\Command;

class ImportSalesHistory extends Command
{
    protected $signature = 'smartbaking:import-sales {file : UTF-8 CSV file} {--commit : Insert validated historical observations; otherwise dry-run}';

    protected $description = 'Validate or import historical sales aggregates without changing live sales or inventory';

    public function handle(SalesObservationImporter $importer): int
    {
        $result = $importer->import((string) $this->argument('file'), (bool) $this->option('commit'));
        if (! $result['valid']) {
            foreach ($result['errors'] as $error) {
                $this->error('Row '.$error['row'].': '.$error['message']);
            }
            $this->line('Validation failed: '.$result['error_count'].' error(s). No observations were imported.');

            return self::FAILURE;
        }
        $this->info($result['committed'] ? 'Historical import committed.' : 'Dry-run passed. Re-run with --commit to import.');
        $this->line('Rows: '.$result['rows'].'; new: '.$result['inserted'].'; unchanged: '.$result['unchanged'].'.');
        $this->line('Live sales, payments and inventory were not changed.');

        return self::SUCCESS;
    }
}
