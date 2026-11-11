---
name: smartbaking-ui
description: Build or review SmartBaking React/Inertia interfaces, including responsive bakery operator workflows, accessible forms, charts, and forecast presentation.
---

# SmartBaking UI/UX

Work in `apps/web`. Inspect the installed starter's page, layout, route-helper, styling, and component conventions before adding a screen. Extend its existing component system rather than introducing a second UI framework.

## Decisions that matter

- Operator screens need the current branch, date/time, units, and action result visible. Use a confirmed business timezone when labeling daily/hourly values.
- Separate actual sales, forecasts, production plans, usable stock, and incoming deliveries in labels and charts. A prediction is not a confirmed shortage or purchase order.
- Show forecast issue time, horizon, and fallback/insufficient-data status when relevant. Do not display confidence percentages unless the backend supplies a defined, evaluated measure.
- Keep recipe units and batch yields visible where a user could confuse kilograms, grams, pieces, or batches. Allow precision appropriate to the ingredient.
- Give forms field-level errors, loading/disabled states during submission, and a recoverable error result. Do not signal success until the server confirms persistence.
- Prefer readable contrast, semantic labels, keyboard access, and large controls for frequent counter/kitchen actions. Verify narrow and wide layouts, empty data, and unusually long product names.
- Keep starter/demo content clearly identified. Do not fill operational dashboards with invented values that look like partner data.

## Boundaries

Server authorization governs branch access; hiding a control does not secure it. Route transactional changes through Laravel. Do not call the private forecasting service directly from the browser or embed service tokens in Vite variables.

An offline indicator must reflect verified connectivity and synchronization state. Do not promise offline sales from a cached page alone. Limit employee/customer identifiers in screenshots, error messages, and demo fixtures.

Use existing frontend checks and inspect the affected screen when a local browser is available. Match the scope of verification to the changed behavior; do not create wording-only tests for reversible visual edits.
