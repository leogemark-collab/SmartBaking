from math import isfinite

from smartbaking_forecasting.smoke import run_smoke


def test_both_libraries_fit_and_predict_on_synthetic_data():
    result = run_smoke()
    assert result["data_source"] == "synthetic_only"
    assert result["real_bakery_model_trained"] is False
    assert result["holiday_country"] == "PH"
    assert len(result["forecast_dates"]) == 7
    for field in ("sarimax_daily_predictions", "lightgbm_daily_predictions"):
        assert len(result[field]) == 7
        assert all(isfinite(value) for value in result[field])
