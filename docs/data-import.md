# Historical sales data and forecasting readiness

Historical aggregates are stored in `sales_observations`, separately from live
POS sales, payments, production batches and stock movements. Importing history
never changes the till, finished goods or ingredients. This milestone supplies a
CLI importer/exporter and a Python contract validator; it does not train a real
bakery model or produce operational forecasts.

Use an authorized local operator account/shell. The CLI intentionally has access
to all configured branches; it is not an HTTP endpoint. Never expose it as an
unrestricted web upload. Keep partner files and exports in the ignored root
`data` directory. Do not put customer/employee names, phone numbers, credentials,
or raw partner records in samples, logs or source control.

## Prepare the CSV

Create the relevant branch and product in the application first. Branch codes and
product SKUs must exist exactly as written. Historical records may refer to an
inactive catalog entry; they still must resolve to a known branch and product.
Each branch needs a valid business timezone, normally `Asia/Manila`.

UTF-8 text, with an optional UTF-8 BOM, is accepted. Use comma-separated CSV with
LF or CRLF rows, this exact header/order, at most **10 MiB**, and at most
**100,000 nonblank observation rows**:

```csv
source_reference,branch_code,product_sku,interval_start,interval_minutes,quantity_pieces,revenue_cents,status
```

| Field | Required meaning |
| --- | --- |
| `source_reference` | Stable external ID, unique within its branch. 1–120 characters, no surrounding whitespace or control characters. Use an aggregate ID, never a person's name. |
| `branch_code` | Exact existing branch code. |
| `product_sku` | Exact existing product SKU. |
| `interval_start` | Start of the interval, including seconds and an explicit offset: `2026-11-01T00:00:00+08:00` or equivalent UTC `2026-10-31T16:00:00Z`. Naive dates and silently normalized invalid dates are rejected. |
| `interval_minutes` | Exactly `1440` for a daily observation or `60` for hourly. |
| `quantity_pieces` | Whole pieces, 0–1,000,000,000; blank only for `missing`. |
| `revenue_cents` | Whole PHP cents, 0–9,000,000,000,000, or blank when unknown. No decimal prices or floating-point values. |
| `status` | Exactly `observed`, `closed`, `stockout`, or `missing`. |

Numeric fields use plain decimal integers (`0`, `12`, `50000`), without commas,
signs, leading zeros, scientific notation or whitespace. Revenue represents the
recorded aggregate; it is not recalculated from today's product price. Timestamps
must align to **midnight in the branch timezone for daily rows**, or to **the
start of a local hour for hourly rows**. All storage/export timestamps are UTC.

Statuses preserve four different conditions:

- `observed`: quantity is required, including an actual observed zero. Revenue
  may be unknown/blank.
- `closed`: quantity must be `0`; revenue must be `0` or blank. This is a closure,
  not an observed day with zero demand.
- `stockout`: recorded quantity is required and remains **censored sales**. It
  does not reveal how much demand was lost after stock ran out.
- `missing`: quantity and revenue must both be blank; they become JSON/database
  nulls. An absent row is an unrecorded interval and is not filled with zero.

Daily and hourly observations can coexist as separate aggregates. Exports select
one frequency and do not add daily totals to hourly totals, combine imported
history with live sales, or automatically aggregate censored/missing intervals.
Choose the appropriate original frequency and resolve source overlap before a
future training pipeline uses either series.

## Validate, then explicitly commit

From the repository root:

```powershell
# Read/validate only. No history or stock is written.
php .\apps\web\artisan smartbaking:import-sales .\data\imports\bakery-history.csv

# Explicitly insert the validated historical observations.
php .\apps\web\artisan smartbaking:import-sales .\data\imports\bakery-history.csv --commit
```

The importer validates the entire bounded file and database conflicts before a
transaction inserts anything. Any invalid row or conflict rejects the import.
Validation retains the bounded row set in memory. For large hourly files near
the import limits, use `php -d memory_limit=512M` before the Artisan command or
split the source into smaller files with non-overlapping stable references.
Errors identify CSV row numbers and generic reasons without printing submitted
records; at most 100 errors are displayed, with the total error count retained.

Reimporting the same reference and canonical payload is a no-op, including an
equivalent offset representation of the same instant. An exact repeated row in
one file is also a no-op. A changed payload under an existing reference, or a
different reference claiming the same branch/product/start/frequency, is
rejected. Existing history is never silently overwritten. Correct a source
conflict deliberately before retrying; changing IDs is not a correction policy.

The importer service API is
`SalesObservationImporter::import(string $file, bool $commit = false): array`.
It returns `valid`, `committed`, `rows`, `inserted`, `unchanged`, `status_counts`,
`errors` (`row` and `message`) and `error_count`. `inserted` is the new-row count:
**planned during dry-run**, actually inserted only when `committed` is true.

## Export a private forecasting dataset

An output path is mandatory. Only **new `.json` files inside the ignored root
`data/exports` directory** are accepted; the command refuses existing files and
paths outside that directory. Relative paths resolve from the current shell
directory. The command creates needed export subdirectories.

```powershell
php .\apps\web\artisan smartbaking:export-dataset BRANCH-CODE PRODUCT-SKU --from=2026-08-01 --to=2026-10-31 --frequency=daily --output=.\data\exports\daily-history.json

# Or hourly, preserving the original hourly observations only.
php .\apps\web\artisan smartbaking:export-dataset BRANCH-CODE PRODUCT-SKU --from=2026-11-01 --to=2026-11-07 --frequency=hourly --output=.\data\exports\hourly-history.json
```

`--from` and `--to` are inclusive **business dates**. The exporter scopes by branch,
product and requested frequency, orders observations chronologically, and writes
no customer, staff or source-reference fields. Console diagnostics report the
selected window's expected intervals, unrecorded gaps, and status counts; they
do not print the observations themselves. An empty dataset is explicit, not
fabricated training data.

The versioned JSON contract is:

```json
{
  "schema_version": "1.0",
  "branch_code": "SAMPLE-CENTRAL",
  "product_sku": "SAMPLE-PAN-001",
  "business_timezone": "Asia/Manila",
  "frequency": "daily",
  "unit": "pieces",
  "observations": [
    {
      "timestamp": "2026-10-31T16:00:00Z",
      "quantity": 100,
      "revenue_cents": 50000,
      "status": "observed"
    }
  ]
}
```

## Validate in Python

```powershell
cd .\services\forecasting
uv run --locked python -m smartbaking_forecasting.dataset ..\..\data\exports\daily-history.json
uv run --locked pytest -q tests/test_dataset.py
```

The strict Pydantic contract rejects unknown/PII fields, invalid timezones,
unordered/duplicate timestamps, misaligned intervals, non-integer or out-of-range
quantities/money, and incompatible status values. JSON input is bounded to 32 MiB
and 100,000 observations. It preserves nulls and does not create missing rows.

Readiness reports status counts, gaps **between the first and last supplied
observation**, review reasons and a conservative experiment-history threshold
(56 observed daily intervals or 336 observed hourly intervals). These are initial
screening guardrails, not accuracy promises or proof that holiday/payday effects
can be estimated. Missing, censored and closed intervals require a documented
modeling policy; even sufficient clean history only permits considering a
baseline experiment. `can_train` stays false and `model_status` stays
`not_trained`: a training pipeline has not been implemented.

The contract has no requested-window bounds. Python cannot detect records absent
before the first or after the last supplied observation; use the Laravel export
diagnostics to assess the complete requested date window. Neither validator
establishes a reliable holiday effect, corrects lost demand, or chooses a model.

## Synthetic examples

`samples/imports/synthetic-daily.csv` and `synthetic-hourly.csv` contain deliberately
short fake records demonstrating all four statuses. They are not partner data and
are insufficient for training. There is no default demo catalog seed. To try them
in a disposable development database, first create a trial branch with code
`SAMPLE-CENTRAL`, timezone `Asia/Manila`, and trial product `SAMPLE-PAN-001`, then:

```powershell
php .\apps\web\artisan smartbaking:import-sales .\samples\imports\synthetic-daily.csv
php .\apps\web\artisan smartbaking:import-sales .\samples\imports\synthetic-hourly.csv
```

These remain dry-runs unless you explicitly add `--commit`. Keep synthetic trial
catalog/history separate from real branch records. Do not import these samples
into a partner's operational dataset.
