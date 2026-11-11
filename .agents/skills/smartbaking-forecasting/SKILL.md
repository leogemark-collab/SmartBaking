---
name: smartbaking-forecasting
description: Develop SmartBaking daily/hourly demand forecasting, SARIMAX or LightGBM experiments, calendar features, time-based evaluation, and forecast-to-production data contracts.
---

# SmartBaking forecasting and data science

Work in `services/forecasting`. Inspect `pyproject.toml`, the API schema, and existing tests first. An installed algorithm is an experiment option, not an evaluated production model.

## Initial modeling direction

Compare daily SARIMAX and/or LightGBM with a matching-weekday seasonal baseline. Keep the baseline available for sparse histories or model failures and expose the reason when it is used. Start hourly prediction with daily forecasts allocated through historical hourly profiles and updated using observed sales; add a separate hourly model only when the task and evaluation justify it.

SARIMAX can accept holiday/payday/promotional regressors. For hourly series with daily and weekly cycles, one seasonal period is not automatically sufficient: evaluate suitable calendar/Fourier regressors or a dedicated approach. LightGBM needs explicit calendar, lag, and rolling features. Do not assume either model wins before testing.

## Data and leakage rules

- Define the target and units per product/branch and distinguish gross sales, returns, production, and latent demand. Recorded sales during stock-outs are censored demand.
- Aggregate transaction timestamps in an explicit business timezone. Preserve closed hours/days, missing source records, actual zeros, and stock-out intervals as distinguishable conditions.
- Future holidays/paydays/promotions must be known at issue time. Do not assume every customer follows a universal payday calendar. Weather inputs require forecasts available at that time, not future observations.
- Shift historical rolling features before prediction. Fit imputation, scaling, encodings, feature selection, and parameter search inside training windows.
- Backtest chronologically with matching operational horizons. Do not random-split a time series or tune on the final holdout.
- Separate branches and products explicitly. Pooling and cross-branch information must respect availability times and be evaluated rather than presumed beneficial.
- Short histories may contain few holiday examples. Expose this limitation; flags alone do not establish a reliable holiday effect.

## Useful outputs and evaluation

Return forecast issue time, forecast timestamps, branch/product, units, model/version, fallback status, and assumptions. Validate finite quantities and consistent series frequency; document any treatment of negative statistical forecasts. Hourly allocation should reconcile to its daily total before new intraday evidence changes the remaining-day estimate.

Compare MAE, WAPE with an explicit zero-denominator policy, and signed bias on identical windows. Evaluate quantiles with pinball loss and intervals with coverage when those outputs are implemented. Label synthetic demonstrations; do not report their scores as bakery accuracy.

Forecast far enough to cover the production/ordering decision horizon. Ingredient requirements follow planned production batches and recipe yields, not a second raw-material deduction at sale. For shortage dates and supplier-aware orders, combine this skill with `smartbaking-inventory`.
