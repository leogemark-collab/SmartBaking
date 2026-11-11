# Development milestone: real-data foundation

The signed-in workspace now reads and writes Laravel records. `/preview` remains an isolated synthetic interface, with no operational database writes. There are no automatically seeded branches, products, recipes, stock balances, sales, or staff accounts.

## Begin with your catalog

1. Start the services with `scripts/dev.ps1`, register, and verify your account email.
2. Open `http://localhost:8000/dashboard`. On a new **local** installation, explicitly create the first branch to initialize your account as owner. For other environments, initialize an existing owner account from the trusted server console with `php apps/web/artisan smartbaking:grant-owner owner@example.com`; do this before exposing public registration. Verification still applies.
3. Open **Bakery setup**. Create your real branch names/codes, ingredients with base units, and products with selling prices. Every new branch defaults to baking its own products, as confirmed for this project.
4. Create a recipe version for each product: finished pieces per batch, and each ingredient quantity in kg, L, or whole pieces. Start with confirmed partner recipes; the demo formulations are not automatically copied.
5. In **Inventory**, receive opening ingredients with an opening-stock reference. Opening balances use explicit receipt records and stock movements, rather than an editable balance.
6. In **Production**, plan a whole number of batches. Starting mixing consumes raw ingredients exactly once. Advance to baking and complete with the actual piece yield (including zero for a failed batch). Completing production adds finished goods once.
7. In **Point of sale**, sell only available finished pieces. The server prices the order, checks cash, records change, and atomically deducts finished goods. It never deducts ingredients again.
8. Review actual database totals and recent sales in **Overview** and **Reports**. Reporting dates use Philippine business-day boundaries; stored timestamps are UTC.

Catalog views currently load up to 500 products/ingredients; operational lists show the latest 50 records. Report totals cover the complete selected date window, while CSV exports explicitly cover the displayed list. Further pagination and full-history report exports are later enhancements.

Use a separate development database while testing. Once real transactions begin, correcting or refunding them needs a reviewed reversal workflow; manually deleting ledger rows is not that workflow.

## Identity and branches

Global owner/administrator roles can manage the catalog and branch memberships. Other verified users require explicit branch membership:

| Branch role | Read branch workspace | Receive ingredients | Produce | Sell |
| --- | --- | --- | --- | --- |
| Cashier | Yes | No | No | Yes |
| Baker | Yes | No | Yes | No |
| Supervisor | Yes | Yes | Yes | Yes |

Owners grant access to an existing verified account using its email. Selecting another branch in the browser never grants access. Laravel checks both role and branch on reads, totals, and mutations. User accounts linked to access/history cannot be deleted through the profile form, preserving references. Membership changes are not attendance or payroll records.

The first-owner web action defaults to local environments only and serializes the claim through a single installation record. `ALLOW_INITIAL_SETUP=false` explicitly disables it locally too. Credentials and sender settings remain private configuration; owner setup does not bypass email verification.

## Stored precision and history

- Money is integer PHP cents. The browser converts a displayed peso amount to cents, and Laravel computes authoritative totals.
- Ingredient quantities are integer thousandths of their declared base unit. For example, 1.250 kg is 1250 milli-units, 0.500 L is 500, and 3 eggs is 3000. Piece ingredients require multiples of 1000.
- Finished stock and sale quantities are integer pieces. The movement ledger normalizes their deltas to thousandths for its common quantity column; 3 pieces is a 3000 movement.
- Recipes are new versions, never overwritten by the HTTP catalog flow. A planned batch pins the recipe, yield, and ingredient requirements so later recipe changes cannot alter its consumption.
- Sales keep product-name and unit-price snapshots. Current catalog changes do not rewrite past line items.
- Receipts, production plans, and sales carry branch-scoped UUID request keys plus canonical payload hashes. Retrying the same data returns the existing record. Reusing the key for changed data rejects the request.
- Stock checks and related records commit together. Conditional decrements reject insufficient stock; an unsuccessful batch start or sale rolls back its other changes. Database locks/retries are used in addition to unique keys.

## Prepare future data

See [historical data imports](data-import.md) for CSV templates, dry-run validation, explicit commit, and a versioned Python dataset contract. Store partner files under ignored `data/imports` and exports under `data/exports`.

Imported historical observations remain separate from live POS sales and inventory. They preserve observed zero, closures, missing records, and censored stockouts as distinct states. Export selects one frequency and one branch/product; it does not combine overlapping histories or manufacture gaps as zero sales. The Python validator reports data quality and history coverage, not model accuracy. No model is trained or scheduled automatically, and live POS sales are not yet automatically converted into a complete training series.

## Next development slices

1. Transaction corrections/returns, waste, cancellations, audit review, expiry/lot handling, and stock reconciliation.
2. Suppliers, actual purchase orders/deliveries, configurable safety stock/lead times, and tested replenishment advice.
3. Confirmed calendar/holiday/payday inputs, completed live-data collection windows, rolling-origin baseline/SARIMAX/LightGBM evaluation, then advisory daily and hourly predictions.
4. Dispatch/receipt stock transfers, real attendance, and finer reporting permissions.
5. Offline persistence and duplicate-safe synchronization, production database/backup/restore validation, and deployment hardening.

The current result is a tested development foundation and first persistent workflow. It is not a production launch or a completed capstone.
