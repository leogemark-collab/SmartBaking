<?php

return [
    // Store instants in UTC; group daily/hourly business records in Philippine time.
    'business_timezone' => env('BUSINESS_TIMEZONE', 'Asia/Manila'),
    'currency' => env('BUSINESS_CURRENCY', 'PHP'),
    // The explicit first-owner web setup is available only on a local installation.
    // Other environments initialize their owner using the server-console command.
    'allow_initial_setup' => env('ALLOW_INITIAL_SETUP', env('APP_ENV', 'production') === 'local'),

    'forecasting' => [
        'base_url' => env('FORECAST_BASE_URL', 'http://127.0.0.1:8001'),
        'api_key' => env('FORECAST_API_KEY', ''),
        'connect_timeout' => (int) env('FORECAST_CONNECT_TIMEOUT', 3),
        'timeout' => (int) env('FORECAST_TIMEOUT', 15),
    ],
];
