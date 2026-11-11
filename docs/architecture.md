# Development architecture

## Service boundaries

The browser talks to Laravel. Laravel owns authentication, authorization, branch access, transaction validation, inventory movements, and the authoritative database. The React/TypeScript frontend uses Inertia; it does not receive the forecasting service API key.

The signed-in workspace now persists branches, role memberships, products, ingredients, versioned recipes, receipts, production stages, stock movements, and cash sales. Ingredients are consumed when mixing starts; actual finished yield enters stock on batch completion. Checkout deducts finished goods only. `/preview` uses separate synthetic frontend scenarios. See [the current development workflow](development-roadmap.md) for scope and setup.

Laravel calls the Python service over HTTP. The service currently provides public `/health` and API-key-protected `/v1/capabilities` endpoints. The `forecast:check` Artisan command verifies both. All service addresses default to loopback for local use. A new server-to-server token is generated on initial setup and stored only in ignored environment files.

FastAPI owns future model fitting, backtesting, and prediction. It does not need direct access to the Laravel database in the environment milestone. Define versioned request/response contracts before adding data or training endpoints. Repeated training and batch work should run outside interactive checkout requests.

## Forecasting and replenishment plan

1. Record product sales, production, stock-out intervals, waste, promotions, and calendar context per branch.
2. Evaluate SARIMAX and LightGBM against simple seasonal baselines with rolling-origin backtests. Installation is not model selection. Report the data frequency, forecast issue time, horizon, and whether the forecast used a fallback.
3. Initially estimate hourly demand by allocating daily forecasts through historical hourly profiles; adjust remaining-hour forecasts using observed sales. A daily model does not automatically yield hourly predictions. Introduce an independently fitted hourly model only if evaluation justifies it.
4. Convert accepted production plans into ingredient requirements through recipes, batch sizes, and yields. Ingredients are consumed at production time, not at the subsequent finished-goods sale.
5. Project usable ingredient stock over future production times, adding only deliveries due by each time and accounting for expiry and branch ownership. Identify the first projected shortage.
6. Plan ingredient purchase dates and quantities using supplier lead times, safety stock, current supply, and a horizon covering the ordering schedule. Recalculate when production or deliveries change. Advisory alerts do not place external orders.

Model fitting, operational forecast endpoints, replenishment and transfer planning remain later development slices. The first persistent stock/production/sales workflow is implemented. The Python service still exposes capabilities/readiness rather than live predictions, with an additional standalone validator for imported historical datasets. The [historical importer/exporter](data-import.md) preserves missing/closed/stockout semantics without affecting current stock or live sales.

## Time, identity, and data

- Persist instants in UTC. Derive sales days, hourly groups, holidays, payday indicators, and branch opening hours in `Asia/Manila`.
- Holiday flags and payday schedules must be known at forecast issue time. More hourly rows do not create more independent holiday occurrences.
- Sales under stock-outs are censored. Keep observed sales separate from estimated missed demand; never evaluate imputed demand as independently observed truth.
- Use decimals or integer minor units for money and consistent base units for ingredients. Preserve append-only inventory movement history when the domain is implemented.
- A role library does not enforce branch boundaries by itself. Implement and test server-side policies for each branch-owned resource.
- Ordinary PostgreSQL replication is not offline-first synchronization. Future POS offline support needs persistent client events, idempotent server acceptance, failure recovery, and reconciliation tests.

## Local choices

The web app uses SQLite with database-backed queues, cache, and sessions. A queue worker should be started when asynchronous application jobs are introduced. Email defaults to Laravel's local log transport; real inbox delivery requires configured SMTP ([email setup](email.md)). A remote API, paid services, and a cloud deployment are not needed for this development milestone. Production hosting, database choice, backup/restore, concurrent terminals, and offline synchronization require their own validation before rollout.

The official Laravel React starter was retrieved from `laravel/react-starter-kit` main at commit `012f4248f70e255e32ad93f540aca5fb7e8c96fe`. Runtime dependencies are resolved to stable releases and locked in `apps/web/composer.lock` and the npm lockfile; future setup uses these files rather than downloading a new starter.

## Primary references

- [Laravel starter kits](https://laravel.com/framework/docs/starter-kits)
- [statsmodels SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html)
- [LightGBM parameters](https://lightgbm.readthedocs.io/en/stable/Parameters.html)
- [uv project locking](https://docs.astral.sh/uv/concepts/projects/sync/)
- [Material requirements planning](https://docs.oracle.com/cd/A60725_05/html/comnls/us/mrp/mrpover.htm)
