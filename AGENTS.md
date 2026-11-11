# SmartBaking agent guide

SmartBaking is a Laravel web application with a Python forecasting service. The current milestone includes the development environment, synthetic UI preview, and first persistent branch/catalog/inventory/production/cash-sales workflow. See `docs/development-roadmap.md` for implemented boundaries and remaining work. Extend business modules only within the requested slice; offline synchronization is future implementation work.

## Workspace

- `apps/web`: Laravel, React, TypeScript, Inertia, and the starter kit's UI components.
- `services/forecasting`: Python API, forecasting methods, and model evaluation.
- `scripts`: development setup, launch, and verification helpers.
- `docs`: architecture, environment, and team workflow.
- `.agents/skills`: project-specific specialist instructions.
- `.codex/agents`: project-scoped department agent definitions, inheriting the parent session's model and permissions.

Keep Laravel responsible for authentication, branch authorization, transactional business records, and calls to the forecasting service. Keep model fitting and forecast calculations in Python. Exchange versioned, validated data contracts rather than sharing database credentials.

## Specialist routing

Read the skill that matches the work. For changes spanning departments, establish the API/domain contract first and combine relevant skills.

| Department / agent | Skill | Applies to |
| --- | --- | --- |
| UI/UX / `ui_designer` | `.agents/skills/smartbaking-ui/SKILL.md` | React/Inertia screens, accessibility, responsive operator workflows |
| Backend / `laravel_backend` | `.agents/skills/smartbaking-laravel/SKILL.md` | Laravel routes, policies, validation, persistence, Python integration |
| Forecasting / `forecasting_scientist` | `.agents/skills/smartbaking-forecasting/SKILL.md` | Daily/hourly prediction, holiday/payday features, backtesting |
| Inventory / `inventory_engineer` | `.agents/skills/smartbaking-inventory/SKILL.md` | Recipes, production, stock movements, shortage and replenishment planning |
| Quality / `quality_engineer` | `.agents/skills/smartbaking-quality/SKILL.md` | Tests, regressions, authorization and data-integrity verification |
| Environment / `environment_engineer` | `.agents/skills/smartbaking-environment/SKILL.md` | Dependencies, local services, configuration, CI/deployment preparation |

Use the matching custom agent for independent delegated work when the client exposes project agents. The definitions and skills do not start always-running workers. Assign explicit file ownership and avoid concurrent edits to dependency lockfiles.

## Domain invariants

- Consume raw ingredients when a production batch is recorded. Sales reduce finished-product stock; they must not deduct the ingredients a second time.
- Represent branch ownership explicitly and enforce access on the server. A branch selected in the UI is not authorization.
- Preserve stock-movement history, recipe/batch units and yields, and money/quantity precision. Inventory changes that belong together must commit together.
- Forecasts are advisory estimates, not recorded sales or inventory movements. Store the issue time, horizon, assumptions, model version, and fallback status needed to interpret them.
- Holiday, payday, and promotion features must be known at forecast issue time. Fit preprocessing and models using only the training window.
- Missing records, closures, stock-outs, and observed zero demand are different states. Never silently fabricate training observations.
- Offline support is an aspiration. Do not label a page or transaction offline-capable without durable local storage, retry/idempotency behavior, and reconnection checks implemented and verified.
- Keep employee/customer PII, credentials, sales exports, and trained artifacts out of source control and routine logs. Use synthetic fixtures and aggregate data for development.

## Working and verification

Read the root README and `docs/team-workflow.md` for maintained setup and run instructions. Inspect `apps/web/composer.json`, `apps/web/package.json`, and `services/forecasting/pyproject.toml` before invoking commands; use the committed lockfiles and task-appropriate checks.

From the repository root, the Windows helpers are:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

Setup installs dependencies and applies pending development migrations; `-SkipBuild` skips its frontend build. Dev starts the three local services. Doctor reports runtime/dependency presence without exposing environment values. Check builds the frontend, checks TypeScript, runs Laravel/Python tests, and runs the forecasting smoke check. Check does not include every optional formatting/static-analysis command below.

Commands declared by the current manifests:

| Working directory | Command | Purpose |
| --- | --- | --- |
| `apps/web` | `npm run build` | Build frontend assets with the starter's Vite Plus tooling |
| `apps/web` | `npm run types:check` | Check TypeScript |
| `apps/web` | `npm run check` | Run the frontend code checks |
| `apps/web` | `composer test` | Run PHP formatting, static analysis, and Laravel tests |
| `services/forecasting` | `uv sync --locked` | Install the locked Python environment |
| `services/forecasting` | `uv run smartbaking-forecasting-serve` | Start the Python API |
| `services/forecasting` | `uv run smartbaking-forecasting-smoke` | Check installed modeling dependencies |
| `services/forecasting` | `uv run pytest` | Run Python tests |
| `services/forecasting` | `uv run ruff check .` | Check Python code |

Keep changes within the requested milestone. Report which checks passed and any real unverified dependency or external service requirement. A starter kit, installed library, or scaffold is not a completed bakery feature.
