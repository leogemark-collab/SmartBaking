# SmartBaking forecasting service

Python 3.12 environment for the capstone's statistical and machine-learning
experiments. SARIMAX (statsmodels), LightGBM, scikit-learn, NumPy, pandas, SciPy,
Philippines holiday calendars, and joblib are installed. FastAPI serves a small
Laravel-to-Python health/capabilities API. No real bakery model is trained and no
production forecast or training endpoint exists yet.

Run commands in `services/forecasting`:

```powershell
uv sync --locked
uv run --locked smartbaking-forecasting-serve
```

The default address is `http://127.0.0.1:8001`. `FORECAST_HOST` and `FORECAST_PORT`
can override it. Run the root setup script to create matching random credentials
in Laravel's and this service's ignored `.env` files. For manual setup, copy
`.env.example` to `.env`, replace `FORECAST_API_KEY` with a strong local token, and
configure that same token in Laravel. Settings always read this service's `.env`
regardless of the shell's working directory. Restart after changing settings.

## API contract

- `GET /health` is public. A `200` response is
  `{"status":"ok","service":"smartbaking-forecasting","version":"0.1.0","model_status":"not_trained"}`.
  This is service readiness, not a claim of forecasting accuracy or real training.
- `GET /v1/capabilities` requires `X-API-Key` matching `FORECAST_API_KEY`. The `200`
  response adds installed library versions, installed model families,
  `holiday_country: "PH"`, and `forecasting_endpoints_available: false`.
- Missing/wrong caller credentials return `401`. An unset, blank, or unchanged
  example server credential returns `503`. Error bodies follow FastAPI's
  `{"detail":"..."}` format. Credentials are never returned.

The Laravel backend calls Python directly; browser CORS is unnecessary. Keep
this service bound to loopback for local development. Public deployment requires
an appropriate network and reverse-proxy setup. Interactive API documentation is
disabled on this environment API.

## Verify the installation

```powershell
uv run --locked smartbaking-forecasting-smoke
uv run --locked pytest
uv run --locked ruff check .
uv run --locked ruff format --check .
```

The reproducible smoke check actually fits SARIMAX and LightGBM on seeded fake
daily observations, predicts seven held-out dates with finite values, and checks
that `holidays.country_holidays("PH")` recognizes Independence Day. It writes no
model artifacts. Its JSON explicitly identifies synthetic data: these numbers
are installation checks, not useful bakery forecasts or model evaluation.

For this short seven-day example, LightGBM's seven-day lag features come entirely
from the training period. Real experiments must use rolling time-based splits,
features available at forecast time, recorded stock-outs, and baselines. Holiday
calendars still need review against announced national/local holidays; the sample
15th/month-end payday rule is illustrative, not a configured bakery policy.

Future development can compare daily SARIMAX and LightGBM against a seasonal
baseline. Hourly allocation, BOM-based ingredient planning, stock-out estimation,
and replenishment decisions remain separate planned implementation work.

## Dependency policy

Commit `pyproject.toml` and `uv.lock`; ignore `.venv`, credentials, private data,
and trained artifacts. `uv sync --locked` reproduces the locked resolution.
Review intentional updates with `uv lock --upgrade` and repeat the checks.

Official references: [uv lock/sync](https://docs.astral.sh/uv/concepts/projects/sync/),
[SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html),
[LightGBM](https://lightgbm.readthedocs.io/en/stable/Python-Intro.html),
and [holidays](https://holidays.readthedocs.io/en/latest/).
