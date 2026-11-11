# SmartBaking interface preview

Start the local services with `scripts/dev.ps1`, then open `http://localhost:8000/preview`. The public homepage remains at `/`, with staff login and workspace preview links. No account is needed to review synthetic scenarios.

Authenticated, verified staff routes now render the separate persistent workspace: `/dashboard`, `/pos`, `/production`, `/inventory`, `/forecasts`, `/transfers`, `/team`, `/reports`, and owner `/setup`. See [the real-data development workflow](development-roadmap.md). The public preview route continues to render synthetic screens only and accepts a fixed list; it cannot open account settings or arbitrary Inertia components.

| Screen | Try it |
| --- | --- |
| Overview | Switch today/last seven days, view exact chart values, follow a bake plan or stock alert. |
| Point of sale | Search/filter products, build an order, adjust quantities, enter cash, complete a demo checkout, copy the clearly marked demo receipt. Cash uses integer cents; sample finished stock decreases on this screen. |
| Production | Search/filter batches, plan a new batch with a valid time and whole-piece yield, advance ready → mixing → baking → completed. |
| Inventory | Search/filter usable ingredients, receive a demo quantity, export sample inventory, scale simplified recipes by whole batches. |
| Replenishment (inventory tab) | Review projected safety breaches and unmet demand, supplier lead times, incoming-delivery assumptions and pack-rounded quantities; add/remove/export demo purchase drafts. No orders are sent. |
| Demand forecasts | Switch daily/hourly views, product and branch, toggle hypothetical holiday/payday effects, inspect exact values and a separate ingredient balance example. |
| Transfers | Request a demo transfer to a different branch, dispatch, receive, or cancel a request before dispatch. Raw ingredients and finished goods retain their own units. |
| Team & attendance | Filter synthetic staff and record sample check-ins/outs at the labeled demo clock; export the filtered roster. |
| Reports | Switch seven/fourteen-day sample windows, inspect sales and product results, export CSV. |

The shell includes mobile navigation, a sample branch selector, Ctrl/Cmd+K module search, sample notifications, and a preview explanation. Warm cream, terracotta, and sage styling follows the public homepage. Login and verification screens use the same bakery branding. The current workspace uses a light theme.

## Boundaries

Every `/preview` screen displays a demo notice. Preview page actions are local React state and reset when leaving the page, reloading, or changing branch. Preview screens have independent synthetic scenarios, rather than a shared transaction ledger. Changing a preview branch resets the scenario; it is not server authorization. The signed-in workspace has its own layout, real branch selector, server authorization and database writes. Staff account settings retain authenticated Laravel behavior.

There are no operational sales, stock, purchasing, payroll, or attendance writes from `/preview`. Demo production does not deduct ingredients or add finished stock. The POS demonstration reduces finished goods locally and never deducts raw ingredients. Demo transfers do not reserve or move real stock. Preview CSV files contain only synthetic records. Live workspace CSV exports are separately labeled actual database records and limited to the displayed scope.

Forecast values and calendar multipliers are hand-authored illustrations, not fitted SARIMAX/LightGBM predictions or measured effects. The holiday on 15 November is explicitly hypothetical. Ingredient examples state their demand, recipe, incoming stock, safety level, lead-time, pack-size, and horizon assumptions. Forecasts never create stock movements or purchase orders. The Python service is not called by the browser.

The first live slice implements validated requests, roles, branch checks, persistent receipts/batches/sales and transactional stock history. Real model evaluation, transfers, attendance, purchasing and the remaining operational scope are tracked in the [roadmap](development-roadmap.md). Offline sales and synchronization are not implemented. No interface status claims durable offline support.

## Verification

Run `npm run types:check` and `npm run build` from `apps/web` with the project-local Node on PATH. `php artisan test` includes public preview, staff authentication/email verification, component whitelist/traversal, query bypass, and secret/staff-data leakage tests. A successful build and HTTP response verify compilation and routing; browser visual and interaction checks are a separate step.
