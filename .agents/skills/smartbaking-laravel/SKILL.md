---
name: smartbaking-laravel
description: Implement SmartBaking Laravel backend behavior, branch authorization, transactional records, request validation, and integration with the Python forecasting API.
---

# SmartBaking Laravel backend

Work in `apps/web`. Read the installed Laravel version and starter conventions before choosing APIs. Follow its existing route, Inertia, request-validation, policy, and test patterns; introduce domain abstractions when they reduce actual complexity.

## Business boundary

Laravel owns users, permissions, branch-scoped data, sales, recipes, production, inventory, and the authoritative clock for business actions. Python owns forecasting calculations. Do not give the Python process unrestricted access to Laravel's operational database as an integration shortcut.

Validate request data on the server. Derive or authorize branch ownership against the authenticated user. Apply this to individual resource lookups, aggregates, exports, queued jobs, and writes, not just list filters.

Record ingredient consumption at production and finished goods consumption at sale. For related stock movements, use transactions, suitable locking/concurrency control, and idempotency for retried requests. Preserve movement history and represent corrections explicitly instead of silently overwriting balances.

## Forecast integration

- Keep the forecasting base URL, timeouts, and any service credential in server-side configuration.
- Exchange explicit schema/version, branch/product identifiers, business timezone, observation frequency, issue time, and forecast horizon.
- Send only data needed for the forecast. Customer or employee names do not belong in demand-model inputs.
- Handle service unavailability and insufficient history as defined states. Do not fabricate a forecast or block unrelated sales merely because analytics is unavailable.
- Validate response dates, units, lengths, finite quantities, and model/fallback metadata before rendering or persisting a recommendation.
- Run costly training outside interactive request latency when it is introduced; do not claim queues or scheduled fitting exist before implementing them.

Use additive migrations and development fixtures suited to the requested milestone. Never point tests at a real bakery database. Select checks from the installed Composer/npm scripts, with feature tests for consequential authorization and inventory behavior.
