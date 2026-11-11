<?php

namespace Tests\Feature;

use App\Services\ForecastingClient;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ForecastingClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        config([
            'smartbaking.forecasting.base_url' => 'http://127.0.0.1:8001',
            'smartbaking.forecasting.api_key' => 'test-only-key',
        ]);
    }

    public function test_capabilities_uses_server_side_key(): void
    {
        Http::fake(['*/v1/capabilities' => Http::response(['model_status' => 'not_trained'])]);

        $result = app(ForecastingClient::class)->capabilities();

        $this->assertSame('not_trained', $result['model_status']);
        Http::assertSent(fn (Request $request) => $request->url() === 'http://127.0.0.1:8001/v1/capabilities'
            && $request->hasHeader('X-API-Key', 'test-only-key'));
    }

    public function test_missing_key_fails_before_sending_a_request(): void
    {
        config(['smartbaking.forecasting.api_key' => '']);

        try {
            app(ForecastingClient::class)->capabilities();
            $this->fail('An unconfigured key must fail before a request is made.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('FORECAST_API_KEY', $exception->getMessage());
            Http::assertNothingSent();
        }
    }

    public function test_upstream_failures_are_not_reported_as_success(): void
    {
        Http::fake(['*/v1/capabilities' => Http::response(['detail' => 'Unauthorized'], 401)]);
        $this->expectException(RequestException::class);

        app(ForecastingClient::class)->capabilities();
    }

    public function test_successful_check_verifies_both_endpoints(): void
    {
        Http::fake([
            '*/health' => Http::response(['status' => 'ok', 'service' => 'smartbaking-forecasting']),
            '*/v1/capabilities' => Http::response([
                'status' => 'ok',
                'service' => 'smartbaking-forecasting',
                'model_status' => 'not_trained',
                'libraries' => ['statsmodels' => 'installed'],
            ]),
        ]);

        $this->artisan('forecast:check')->assertSuccessful();
        Http::assertSentCount(2);
    }

    public function test_check_fails_when_the_service_is_unavailable(): void
    {
        Http::fake(['*' => Http::response(['detail' => 'Unavailable'], 503)]);

        $this->artisan('forecast:check')->assertFailed();
    }

    public function test_check_rejects_an_unrelated_service_response(): void
    {
        Http::fake([
            '*/health' => Http::response(['status' => 'ok', 'service' => 'smartbaking-forecasting']),
            '*/v1/capabilities' => Http::response(['message' => 'Some other service']),
        ]);

        $this->artisan('forecast:check')->assertFailed();
    }
}
