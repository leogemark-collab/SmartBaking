# Local development

SmartBaking starts as a Laravel web application with a separate Python forecasting API. The initial environment provides authentication, the frontend toolchain, database migrations, service connectivity, forecasting libraries, and developer guidance. Business workflows and trained production models are subsequent work.

## Prerequisites

- Windows PowerShell 5.1 or newer.
- PHP 8.4 with the extensions required by Laravel and SQLite (`pdo_sqlite` and `sqlite3`).
- Composer 2.
- Python 3.12 and uv.
- Internet access for the first dependency installation.

The setup script installs the project Node.js 24 LTS runtime under `.tools/node` when it is missing. It prepends that directory to the current process's PATH; it does not replace the machine's Node.js installation. The scripts also leave the machine's PHP and Python installations unchanged.

## First setup

Run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

Setup installs Composer dependencies, frontend dependencies, and the locked uv environment. It copies missing `.env` files, generates a Laravel application key only when one is missing, creates a SQLite file if necessary, and applies pending migrations. Existing data is preserved; it never runs `migrate:fresh`.

Setup also creates a private random `FORECAST_API_KEY` shared by Laravel and the Python service. Existing keys are preserved. If the two configured keys differ, setup stops and asks you to reconcile the local files. Never commit `.env` files or paste these keys into an issue, terminal transcript, or frontend code.

Run setup again after pulling changes that add dependencies or database migrations. Lockfiles make dependencies reproducible. `-SkipBuild` skips the initial frontend build when needed.

## Start development

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

The launcher uses the project Node.js runtime and starts Laravel, the frontend development server, and the Python API together. Use Ctrl+C to stop them. `concurrently --kill-others` shuts down the remaining processes when one exits.

| Address | Purpose |
| --- | --- |
| `http://127.0.0.1:8000` | Laravel application |
| `http://127.0.0.1:8001/health` | Forecasting API health |
| `http://127.0.0.1:8001/v1/capabilities` | Forecasting capabilities; requires the private `X-API-Key` header |

Open the Laravel address for the application. The frontend dev server supplies assets to Laravel. The forecasting service is a server-to-server dependency; its key belongs in Laravel/Python environment files and never in a `VITE_*` variable.

Local defaults use SQLite, UTC storage timestamps, the `Asia/Manila` business timezone, and loopback-only addresses. Review the environment examples before changing databases, ports, or supplier/business calendars. Development servers are for local use and are not production deployment commands.

## Validate the environment

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

Doctor reports versions and whether local dependencies and environment files exist without displaying secrets. The check script builds frontend assets, checks TypeScript, runs Laravel tests, runs Python tests, and exercises forecasting smoke checks. It does not require development servers to be running.

For a single service, use its directory:

```powershell
# Frontend: use .tools/node on PATH, as the root scripts do.
$env:PATH = (Join-Path $PWD '.tools\node') + [IO.Path]::PathSeparator + $env:PATH
npm --prefix apps/web run build
php apps/web/artisan test
uv run --project services/forecasting --locked smartbaking-forecasting-smoke
```

Keep dependency changes intentional: update the relevant manifest and its lockfile together. Do not copy `.venv`, `node_modules`, or `vendor` between machines.

Local Composer configuration uses the normal PSR-4 autoloader to keep initial setup responsive on Windows. Production packaging can generate the optimized autoloader with `composer install --no-dev --optimize-autoloader` after deployment requirements are implemented.

Laravel Boost is installed as a development dependency and configured in the root `.codex/config.toml`. Open the repository root in Codex to discover that MCP server and the department skills/agents. Its server command is `php apps/web/artisan boost:mcp`; the active chat's tools are not retroactively reloaded by editing a config file.

The root GitHub Actions workflow runs the frontend build, TypeScript checks, Laravel tests, Python tests, and forecasting smoke checks on pushes and pull requests. It creates isolated CI configuration and does not use your local `.env` files. Its actions follow the maintained [Node setup](https://github.com/actions/setup-node), [PHP setup](https://github.com/shivammathur/setup-php), and [uv setup](https://github.com/astral-sh/setup-uv) documentation.

## Forecasting implementation boundary

The environment includes the forecasting and inventory-planning dependencies needed for the agreed approach. Installing libraries does not train or validate a model. Collect timestamped sales, stock-out periods, recipes, production batches, holidays/paydays, inventory movements, and supplier lead times before deciding which candidate performs best. Keep a seasonal-naive baseline and evaluate forecasting candidates using time-ordered test periods.

Raw materials are consumed by production batches. Product-demand forecasts inform production plans; recipe requirements and projected inventory balances then estimate ingredient shortages and replenishment dates.
