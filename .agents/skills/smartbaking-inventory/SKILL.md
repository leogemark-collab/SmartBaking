---
name: smartbaking-inventory
description: Implement SmartBaking recipe/BOM calculations, production and stock movements, ingredient shortage projections, and supplier-aware material replenishment planning.
---

# SmartBaking inventory and bakery domain

Confirm the actual production flow when it affects the task: branches may bake, receive finished goods from a central kitchen, or do both. Do not silently assume all branches hold the same ingredients or production capacity.

## Inventory invariants

- Keep raw ingredients and finished products distinct. Consume ingredients when a batch is produced; sales consume finished products only.
- Define each recipe's batch yield, input units, and version. Calculate ingredient requirements from planned batches and expected yield, with explicit unit conversions and documented waste assumptions.
- Use fixed-precision decimal quantities/money where persistence and reconciliation require them. Do not add grams to kilograms or pieces to batches.
- Track receipts, production usage/output, waste, transfers, adjustments, and sales as movements with source references. Corrections need an audit trail.
- Apply related stock updates atomically and make retried submissions safe. Transfers have distinct dispatch and receipt states; stock in transit cannot also be freely usable at both branches.
- Available stock excludes unusable/expired quantities and respects reservations already included in the calculation. Avoid counting commitments twice.

## Planning methods

Use BOM-based material requirements planning: turn production plans into dated ingredient consumption, then net against usable stock and confirmed deliveries. Project balances through the planning horizon:

`projected balance = prior balance + usable receipts due - planned consumption`

Report the first date or batch for which projected material is insufficient, and distinguish a safety-stock breach from physical stock-out. A forecast-based shortage is an estimate with assumptions, not a guaranteed event.

Recommend order dates using supplier lead time, receiving/ordering calendars, review cadence, and the expected consumption schedule. Suggest quantities against a defined target horizon, subtract confirmed incoming supply, round to purchase packs/minimums, and account for shelf life. A fixed reorder point may be a transparent fallback; holiday peaks call for time-phased consumption.

Surface units, branch, issue time, incoming-delivery assumptions, safety stock, and lead time in recommendations. Do not create purchase orders or change stock merely because a projection is calculated. Newsvendor optimization is optional future scope unless the requested feature requires cost-based bake decisions and the necessary costs/distributions exist.

Use small deterministic examples to verify unit conversion, batch rounding, existing deliveries, expiry, simultaneous usage, and the no-double-consumption invariant when implementing these calculations.
