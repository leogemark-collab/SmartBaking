"""Deterministic synthetic installation check, never a real bakery forecast."""

import json
import os
from datetime import date

SERVICE_NAME = "smartbaking-forecasting"


def run_smoke() -> dict:
    """Fit two tiny models with fake daily data; do not write trained artifacts."""
    # Keep this installation check small on developer laptops and shared CI.
    # These must be set before importing the numerical libraries.
    for variable in (
        "OMP_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "MKL_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
    ):
        os.environ.setdefault(variable, "1")

    import holidays
    import numpy as np
    import pandas as pd
    from lightgbm import LGBMRegressor
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    rng = np.random.default_rng(42)
    dates = pd.date_range("2024-01-01", periods=196, freq="D")
    calendar = holidays.country_holidays("PH", years=[2024])
    if date(2024, 6, 12) not in calendar:
        raise RuntimeError("Philippines holiday support failed the known-date check.")

    frame = pd.DataFrame(index=dates)
    frame["weekday_sin"] = np.sin(2 * np.pi * dates.day_of_week / 7)
    frame["weekday_cos"] = np.cos(2 * np.pi * dates.day_of_week / 7)
    frame["holiday"] = [float(day.date() in calendar) for day in dates]
    # Synthetic example only: real payday definitions come from the bakery.
    frame["payday"] = np.asarray((dates.day == 15) | dates.is_month_end, dtype=float)
    frame["sales"] = (
        100
        + 15 * frame["weekday_sin"]
        + 8 * frame["holiday"]
        + 10 * frame["payday"]
        + rng.normal(0, 2, len(frame))
    )
    frame["lag_7"] = frame["sales"].shift(7)
    frame = frame.dropna()
    train, future = frame.iloc[:-7], frame.iloc[-7:]
    calendar_features = ["holiday", "payday"]

    sarimax = SARIMAX(
        train["sales"],
        exog=train[calendar_features],
        order=(1, 0, 0),
        seasonal_order=(1, 0, 0, 7),
        trend="c",
    ).fit(disp=False, maxiter=200)
    if not sarimax.mle_retvals.get("converged", False):
        raise RuntimeError("Synthetic SARIMAX fit did not converge.")
    sarimax_predictions = np.asarray(
        sarimax.get_forecast(steps=7, exog=future[calendar_features]).predicted_mean
    )

    features = ["weekday_sin", "weekday_cos", "holiday", "payday", "lag_7"]
    lightgbm = LGBMRegressor(
        n_estimators=25,
        max_depth=3,
        num_leaves=7,
        min_child_samples=10,
        random_state=42,
        n_jobs=1,
        deterministic=True,
        force_col_wise=True,
        verbosity=-1,
    )
    lightgbm.fit(train[features], train["sales"])
    lightgbm_predictions = lightgbm.predict(future[features])

    for name, predictions in (
        ("sarimax", sarimax_predictions),
        ("lightgbm", lightgbm_predictions),
    ):
        if len(predictions) != 7 or not np.isfinite(predictions).all():
            raise RuntimeError(f"{name} did not produce seven finite daily predictions.")

    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "data_source": "synthetic_only",
        "real_bakery_model_trained": False,
        "holiday_country": "PH",
        "holiday_check": "2024-06-12",
        "forecast_dates": [day.date().isoformat() for day in future.index],
        "sarimax_daily_predictions": np.round(sarimax_predictions, 3).tolist(),
        "lightgbm_daily_predictions": np.round(lightgbm_predictions, 3).tolist(),
    }


def main() -> None:
    print(json.dumps(run_smoke(), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
