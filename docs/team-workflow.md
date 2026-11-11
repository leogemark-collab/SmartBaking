# SmartBaking development workflow

This repository contains a Laravel web application and a separate Python forecasting API. The current development slice adds persistent branch, catalog, receipt, production and cash-sale records to the reproducible environment. Refer to `development-roadmap.md` for the first real workflow; forecasting models, payroll and offline synchronization remain later work.

## Department skills

Project-specific instructions live in `.agents/skills`. The root `AGENTS.md` maps work to six departments: UI/UX, Laravel backend, forecasting, inventory/domain, quality, and environment. Each skill is a self-contained `SKILL.md` and can be selected by task or invoked by name, for example `$smartbaking-forecasting`.

Six corresponding custom agent definitions live in `.codex/agents`: `ui_designer`, `laravel_backend`, `forecasting_scientist`, `inventory_engineer`, `quality_engineer`, and `environment_engineer`. Each definition routes its agent to the relevant skill and inherits the parent session's model, permissions, provider, and connected tools. The format follows [official OpenAI documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).

These files guide delegated work; they do not start persistent workers or replace runtime dependencies. Ask Codex to delegate a specific task to a named agent. Discovery depends on the client/session; if a new skill is absent from the current list, ask the agent to read its `SKILL.md` directly.

## Dividing work

For parallel implementation, define a small deliverable, the files each contributor owns, and the contract shared across components. Keep one owner for each manifest and lockfile during dependency updates. A useful division is:

| Department | Typical ownership |
| --- | --- |
| UI/UX | Inertia pages, React components, styles, accessibility |
| Backend | Laravel routes, policies, requests, migrations, application services |
| Forecasting | Python API contracts, model code, chronological evaluation |
| Inventory/domain | Recipe and movement rules, production/replenishment calculations |
| Quality | Focused test cases, regression verification, review findings |
| Environment | Setup/start/check scripts, dependency/runtime configuration, developer docs |

Agree on branch identifiers, timestamps/timezone, quantity units, forecast issue time, horizon, and fallback states before connecting the UI, Laravel, and Python. Laravel is the authoritative business application; the Python service supplies forecasts. Operational writes remain explicit actions under Laravel authorization.

## Normal development loop

1. Read `AGENTS.md` and the relevant department skill, then inspect the existing code and manifests.
2. Follow the root README for dependency installation and service startup. Use the committed setup/run helpers when present; inspect their parameters before invoking them.
3. Implement the requested slice, preserving branch access controls and ingredient-at-production accounting.
4. Run the checks declared by the relevant package manifests and any checks needed for the changed behavior. Use synthetic records and an isolated test database.
5. Report the resulting behavior, checks run, and any real remaining limitation. Keep environment scaffolds, demonstrations, experiments, and implemented business features clearly distinguished.

## Modeling workflow

Compare forecasts on the same chronological test windows before choosing a production model. Begin with a matching-weekday baseline, and evaluate SARIMAX and/or LightGBM as data allows. Daily forecasts can initially feed hourly historical profiles with intraday updates. Holidays and paydays are known calendar inputs whose effects still require historical evidence.

Production plans translate forecast product quantities into recipe/batch requirements. Projected ingredient balances and supplier lead times determine shortage estimates and suggested order dates/quantities. Forecasting itself neither deducts stock nor places orders.

Keep bakery exports, employee/customer data, credentials, local databases, and generated model artifacts out of commits. Offline synchronization remains future work until its transaction persistence and reconnection behavior are implemented and verified.
