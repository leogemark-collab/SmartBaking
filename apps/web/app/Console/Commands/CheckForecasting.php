<?php

namespace App\Console\Commands;

use App\Services\ForecastingClient;
use Illuminate\Console\Command;
use Throwable;

class CheckForecasting extends Command
{
    protected $signature = 'forecast:check';

    protected $description = 'Verify the local Python service and its server-to-server authentication';

    public function handle(ForecastingClient $client): int
    {
        try {
            $health = $client->health();
            $capabilities = $client->capabilities();

            if (($health['status'] ?? null) !== 'ok'
                || ($health['service'] ?? null) !== 'smartbaking-forecasting'
                || ($capabilities['status'] ?? null) !== 'ok'
                || ($capabilities['service'] ?? null) !== 'smartbaking-forecasting'
                || ! is_array($capabilities['libraries'] ?? null)) {
                $this->error('The forecasting service did not return the expected readiness and capabilities response.');

                return self::FAILURE;
            }

            $this->info('Forecasting service is reachable and API-key authentication works.');
            $this->line('This verifies the environment. Bakery forecasting models have not been trained.');

            return self::SUCCESS;
        } catch (Throwable) {
            // HTTP exceptions may contain sensitive request details: keep this diagnostic generic.
            $this->error('Forecasting connection check failed. Start the Python service and verify its URL and shared API key.');

            return self::FAILURE;
        }
    }
}
