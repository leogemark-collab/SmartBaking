import json
from copy import deepcopy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError

from smartbaking_forecasting.dataset import ForecastDataset, assess_readiness, read_dataset


def payload(days=3, frequency="daily"):
    start = datetime(2026, 8, 1, tzinfo=ZoneInfo("Asia/Manila"))
    step = timedelta(days=1) if frequency == "daily" else timedelta(hours=1)
    return {
        "schema_version": "1.0",
        "branch_code": "central",
        "product_sku": "PAN-001",
        "business_timezone": "Asia/Manila",
        "frequency": frequency,
        "unit": "pieces",
        "observations": [
            {
                "timestamp": (start + index * step).isoformat(),
                "quantity": 120,
                "revenue_cents": 60_000,
                "status": "observed",
            }
            for index in range(days)
        ],
    }


def test_valid_contract_normalizes_utc_and_reports_short_history_without_training():
    dataset = ForecastDataset.model_validate(payload())
    assert dataset.observations[0].timestamp.isoformat() == "2026-07-31T16:00:00+00:00"
    readiness = assess_readiness(dataset)
    assert readiness["minimum_history_met"] is False
    assert readiness["ready_for_baseline_experiment"] is False
    assert readiness["can_train"] is False
    assert readiness["model_status"] == "not_trained"


@pytest.mark.parametrize("frequency,length", [("daily", 56), ("hourly", 336)])
def test_complete_minimum_history_only_allows_future_baseline_experiment(frequency, length):
    readiness = assess_readiness(ForecastDataset.model_validate(payload(length, frequency)))
    assert readiness["ready_for_baseline_experiment"] is True
    assert readiness["can_train"] is False


def test_gaps_flags_closures_and_actual_zero_remain_distinct():
    data = payload(6)
    data["observations"][0]["quantity"] = 0
    data["observations"][1].update(status="missing", quantity=None, revenue_cents=None)
    data["observations"][2].update(status="stockout", quantity=100)
    data["observations"][3].update(status="closed", quantity=0, revenue_cents=0)
    del data["observations"][4]
    dataset = ForecastDataset.model_validate(data)
    readiness = assess_readiness(dataset)
    assert len(dataset.observations) == 5
    assert readiness["unrecorded_gap_count"] == 1
    assert readiness["status_counts"] == {"observed": 2, "closed": 1, "stockout": 1, "missing": 1}
    assert dataset.observations[0].quantity == 0
    assert dataset.observations[1].quantity is None
    assert "stockout_censored_intervals" in readiness["review_reasons"]


@pytest.mark.parametrize(
    "field,value",
    [
        ("quantity", -1),
        ("quantity", 1.5),
        ("quantity", "12"),
        ("quantity", True),
        ("quantity", float("nan")),
        ("quantity", float("inf")),
        ("quantity", 1_000_000_001),
        ("revenue_cents", -1),
        ("revenue_cents", 1.2),
        ("revenue_cents", 9_000_000_000_001),
        ("status", "estimated"),
        ("quantity", None),
        ("timestamp", "2026-08-01T00:00:00"),
        ("timestamp", "2026-08-01T00:30:00+08:00"),
        ("timestamp", "2026-08-01T01:00:00+08:00"),
        ("timestamp", "2026-02-30T00:00:00+08:00"),
    ],
)
def test_invalid_values_are_rejected(field, value):
    data = payload()
    data["observations"][0][field] = value
    with pytest.raises(ValidationError):
        ForecastDataset.model_validate(data)


@pytest.mark.parametrize(
    "status,quantity,revenue",
    [
        ("missing", 0, None),
        ("missing", None, 0),
        ("closed", 1, 0),
        ("closed", 0, 100),
        ("stockout", None, None),
    ],
)
def test_status_semantics_are_enforced(status, quantity, revenue):
    data = payload()
    data["observations"][0].update(status=status, quantity=quantity, revenue_cents=revenue)
    with pytest.raises(ValidationError):
        ForecastDataset.model_validate(data)


def test_duplicates_order_bad_timezone_and_extra_pii_fields_are_rejected():
    original = payload()
    duplicate = deepcopy(original)
    duplicate["observations"][1] = deepcopy(duplicate["observations"][0])
    reversed_rows = deepcopy(original)
    reversed_rows["observations"].reverse()
    timezone = {**original, "business_timezone": "Not/A-Timezone"}
    pii = {**original, "customer_name": "Synthetic unwanted field"}
    for data in (duplicate, reversed_rows, timezone, pii):
        with pytest.raises(ValidationError):
            ForecastDataset.model_validate(data)


def test_empty_history_is_explicit_and_never_zero_filled():
    data = payload(0)
    dataset = ForecastDataset.model_validate(data)
    readiness = assess_readiness(dataset)
    assert dataset.observations == []
    assert readiness["observation_count"] == 0
    assert "no_history" in readiness["review_reasons"]


def test_private_json_reader_accepts_utf8_bom_without_changing_semantics(tmp_path):
    source = tmp_path / "history.json"
    source.write_text(json.dumps(payload()), encoding="utf-8-sig")
    dataset = read_dataset(source)
    assert len(dataset.observations) == 3
    assert dataset.observations[0].quantity == 120
