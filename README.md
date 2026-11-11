# SmartBaking

SmartBaking bakery capstone: a Laravel web application with persistent branch operations, a separate synthetic UI preview, and an isolated Python forecasting service.

## Start on Windows

Open this directory in your terminal or editor:

```powershell
cd 'D:\Capstone Projects\SmartBaking'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

Keep the development command running. Open **http://localhost:8000** for the web app. The Python service runs at **http://127.0.0.1:8001**, with an open `/health` endpoint and a private `/v1/capabilities` endpoint. Stop the services with Ctrl+C in their terminal.

The root address shows the public SmartBaking homepage. Use its **Staff login** link to sign in; `/dashboard` and staff settings require an account.

The interactive UI preview is at **http://localhost:8000/preview**, also linked from the homepage. It includes synthetic scenarios for the planned modules. The signed-in **http://localhost:8000/dashboard** now uses real database records, with catalog setup, branch permissions, ingredient receipts, production and cash sales. Staff module routes require sign-in and email verification. Start with [the persistent development workflow](docs/development-roadmap.md); [UI preview and scope](docs/ui-preview.md) explains the separate demonstration.

Email starts in local log mode. For real Gmail verification messages, follow [email setup](docs/email.md) and run `scripts/setup-gmail.ps1` in your own terminal to enter the sender credentials privately.

The setup script installs locked dependencies, creates local configuration, generates a shared random service key, applies pending migrations, and builds assets. It preserves existing databases, application encryption keys, and configured service keys. Node 24 LTS is installed in `.tools/node` for this project; the global Node installation is not replaced. PHP 8.4, Composer, Python 3.12, and uv must be available on PATH.

```powershell
# Run the environment and application checks.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1

# Inspect prerequisites without displaying environment secrets.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor.ps1

# With Python running, verify Laravel -> Python authentication.
php .\apps\web\artisan forecast:check
```

## Included foundation

| Area | Stack |
| --- | --- |
| Web | Laravel 13, React 19, TypeScript, Inertia 3, Tailwind 4, starter UI components |
| Authentication and authorization | Laravel Fortify, Spatie roles, verified staff access, and server-enforced branch membership/action checks |
| Persistent operations | Owner catalog setup, recipe versions/snapshots, ingredient receipts, production stages, stock ledger, cash sales, actual totals |
| Historical data | Validated CSV imports, dry-run/commit, isolated observations, dataset exports and Python contract/quality validation |
| Audit foundation | Spatie Activitylog, with business-event logging to be added alongside transactions |
| Frontend utilities | Dexie for future offline persistence, Zod validation, Recharts, bundled local fonts |
| Local persistence | SQLite with database-backed sessions, queues, and cache |
| Python API | FastAPI, Uvicorn, Pydantic settings, private server-to-server API key |
| Forecasting libraries | statsmodels/SARIMAX, LightGBM, scikit-learn, pandas, NumPy, SciPy, holidays, joblib |
| Development | Composer/npm/uv lockfiles, PHP and Python tests, TypeScript checks, setup/run helpers |
| Agent workspace | Six department skills, six matching project agent definitions, root AGENTS.md, Laravel Boost MCP configuration |

The modeling smoke command fits SARIMAX and LightGBM on synthetic data to verify the environment. **There are no trained bakery models or operational forecasts yet.** The live workspace never substitutes demo predictions for real results. See [data import instructions](docs/data-import.md) to prepare future history and [the roadmap](docs/development-roadmap.md) for remaining operational features.

## Project layout

```text
apps/web/                 Laravel application and React frontend
services/forecasting/     Python package, API, dependency lockfile, and tests
scripts/                 Windows installation, development, and check helpers
docs/                    Architecture and team workflow
.agents/skills/          Project-specific department skills
.codex/agents/           Project-specific agent definitions
```

Read [development instructions](docs/development.md), [architecture](docs/architecture.md), and [team workflow](docs/team-workflow.md) before changing the environment. Future coding sessions should open the **SmartBaking** directory so the project instructions and skills are in scope.

## Current milestone and next work

This is the environment milestone. The stock ledger, branch access policies, bakery POS, recipes, production, waste, forecasting data pipeline, hourly updates, and replenishment screens are still to be built. Offline synchronization is not implemented by installing a local-storage dependency.

Keep raw-material consumption tied to production batches; sales reduce finished goods. Keep timestamps in UTC and calculate business dates/hours in `Asia/Manila`. Track holidays and customer-relevant paydays explicitly and validate forecasts using chronological holdouts.

SQLite removes the need for a database server during the first local milestone. PostgreSQL is the planned production database; switching requires installing a PostgreSQL server and PHP's `pdo_pgsql` driver, configuring its credentials, and running the same migrations against it. Docker and a production database server are not prerequisites for this local setup.

Do not commit `.env`, local databases, employee data, sales exports, or trained model artifacts. No remote repository or hosting account has been created.
