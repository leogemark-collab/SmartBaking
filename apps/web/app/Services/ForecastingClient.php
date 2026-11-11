<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ForecastingClient
{
    /** @return array<string, mixed> */
    public function health(): array
    {
        return $this->get('/health');
    }

    /** @return array<string, mixed> */
    public function capabilities(): array
    {
        $apiKey = config('smartbaking.forecasting.api_key');

        if (! is_string($apiKey) || trim($apiKey) === '') {
            throw new RuntimeException('FORECAST_API_KEY is missing. Run the project setup script.');
        }

        return $this->get('/v1/capabilities', $apiKey);
    }

    /** @return array<string, mixed> */
    private function get(string $path, ?string $apiKey = null): array
    {
        $baseUrl = config('smartbaking.forecasting.base_url');

        if (! is_string($baseUrl) || ! filter_var($baseUrl, FILTER_VALIDATE_URL)) {
            throw new RuntimeException('FORECAST_BASE_URL must be a valid HTTP or HTTPS service URL.');
        }

        if (! in_array(parse_url($baseUrl, PHP_URL_SCHEME), ['http', 'https'], true)) {
            throw new RuntimeException('FORECAST_BASE_URL must use HTTP or HTTPS.');
        }

        $request = $this->request();

        if ($apiKey !== null) {
            $request = $request->withHeaders(['X-API-Key' => $apiKey]);
        }

        $response = $request->get(rtrim($baseUrl, '/').$path)->throw();
        $payload = $response->json();

        if (! is_array($payload) || array_is_list($payload)) {
            throw new RuntimeException('The forecasting service returned an unexpected response.');
        }

        return $payload;
    }

    private function request(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(max(1, (int) config('smartbaking.forecasting.connect_timeout', 3)))
            ->timeout(max(1, (int) config('smartbaking.forecasting.timeout', 15)));
    }
}
