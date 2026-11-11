"""Validate historical sales contracts without filling gaps or training a model."""

import argparse
import json
import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
    field_validator,
    model_validator,
)

MAX_OBSERVATIONS = 100_000
MAX_DATASET_BYTES = 32 * 1024 * 1024
Quantity = Annotated[int, Field(strict=True, ge=0, le=1_000_000_000)]
Revenue = Annotated[int, Field(strict=True, ge=0, le=9_000_000_000_000)]
Status = Literal["observed", "closed", "stockout", "missing"]
TIMESTAMP_PATTERN = re.compile(
    r"^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$"
)


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: AwareDatetime
    quantity: Quantity | None
    revenue_cents: Revenue | None
    status: Status

    @field_validator("timestamp", mode="before")
    @classmethod
    def explicit_iso_timestamp(cls, value: object) -> object:
        if not isinstance(value, str) or not TIMESTAMP_PATTERN.fullmatch(value):
            raise ValueError("Timestamp must be ISO text with seconds and an explicit offset or Z.")
        if re.search(r"[+-]14:(?!00)\d{2}$", value):
            raise ValueError("Timestamp UTC offset must not exceed 14 hours.")
        return value

    @field_validator("timestamp")
    @classmethod
    def normalize_utc(cls, value: datetime) -> datetime:
        try:
            return value.astimezone(UTC)
        except (OverflowError, ValueError) as exc:
            raise ValueError("Timestamp is outside the supported datetime range.") from exc

    @model_validator(mode="after")
    def consistent_status(self) -> Self:
        if self.status == "missing":
            if self.quantity is not None or self.revenue_cents is not None:
                raise ValueError("Missing observations require null quantity and revenue.")
        elif self.status == "closed":
            if self.quantity != 0 or self.revenue_cents not in (None, 0):
                raise ValueError("Closed observations require zero quantity and zero/null revenue.")
        elif self.quantity is None:
            raise ValueError("Observed and stockout observations require explicit quantity.")
        return self


class ForecastDataset(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"]
    branch_code: Annotated[str, StringConstraints(strict=True, min_length=1, max_length=32)]
    product_sku: Annotated[str, StringConstraints(strict=True, min_length=1, max_length=64)]
    business_timezone: Annotated[str, StringConstraints(strict=True, min_length=1, max_length=64)]
    frequency: Literal["daily", "hourly"]
    unit: Literal["pieces"]
    observations: Annotated[list[Observation], Field(max_length=MAX_OBSERVATIONS)]

    @field_validator("branch_code", "product_sku")
    @classmethod
    def clean_identifier(cls, value: str) -> str:
        if value != value.strip() or any(
            ord(character) < 32 or 127 <= ord(character) <= 159 for character in value
        ):
            raise ValueError(
                "Identifiers must not contain surrounding whitespace or control characters."
            )
        return value

    @field_validator("business_timezone")
    @classmethod
    def known_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Business timezone must be a recognized IANA timezone.") from exc
        return value

    @model_validator(mode="after")
    def chronological_aligned_intervals(self) -> Self:
        timezone = ZoneInfo(self.business_timezone)
        previous: datetime | None = None
        for observation in self.observations:
            timestamp = observation.timestamp
            if previous is not None and timestamp <= previous:
                raise ValueError(
                    "Observation timestamps must be unique and strictly chronological."
                )
            local = timestamp.astimezone(timezone)
            if local.minute != 0 or local.second != 0 or local.microsecond != 0:
                raise ValueError("Observations must align to the business hour.")
            if self.frequency == "daily" and local.hour != 0:
                raise ValueError("Daily observations must align to business midnight.")
            previous = timestamp
        return self


def assess_readiness(dataset: ForecastDataset) -> dict[str, object]:
    """Count flags and internal gaps, never interpreting absent periods as zero."""
    counts = Counter(observation.status for observation in dataset.observations)
    count = len(dataset.observations)
    expected = 0
    if count:
        first, last = dataset.observations[0].timestamp, dataset.observations[-1].timestamp
        if dataset.frequency == "daily":
            timezone = ZoneInfo(dataset.business_timezone)
            expected = (
                last.astimezone(timezone).date() - first.astimezone(timezone).date()
            ).days + 1
        else:
            expected = int((last - first).total_seconds() // 3600) + 1
    gaps = max(0, expected - count)
    minimum = 56 if dataset.frequency == "daily" else 336
    sufficient = counts["observed"] >= minimum
    reasons = []
    if not count:
        reasons.append("no_history")
    if not sufficient:
        reasons.append("insufficient_observed_history")
    if gaps:
        reasons.append("unrecorded_intervals")
    if counts["missing"]:
        reasons.append("explicit_missing_intervals")
    if counts["stockout"]:
        reasons.append("stockout_censored_intervals")
    if counts["closed"]:
        reasons.append("closed_intervals_need_calendar_policy")
    return {
        "observation_count": count,
        "status_counts": {
            status: counts[status] for status in ("observed", "closed", "stockout", "missing")
        },
        "expected_intervals_within_observed_span": expected,
        "unrecorded_gap_count": gaps,
        "gap_scope": "between_first_and_last_observation_only",
        "minimum_observed_intervals_for_experiment": minimum,
        "minimum_history_met": sufficient,
        "ready_for_baseline_experiment": not reasons,
        "review_reasons": reasons,
        "can_train": False,
        "model_status": "not_trained",
    }


def read_dataset(path: Path) -> ForecastDataset:
    with path.open("rb") as source:
        contents = source.read(MAX_DATASET_BYTES + 1)
    if len(contents) > MAX_DATASET_BYTES:
        raise ValueError("Dataset JSON must be no larger than 32 MiB.")
    # Accept Windows UTF-8 BOM while keeping all semantic fields strict.
    return ForecastDataset.model_validate_json(contents.decode("utf-8-sig"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="Private JSON exported by Laravel")
    arguments = parser.parse_args()
    try:
        dataset = read_dataset(arguments.file)
    except ValidationError as exc:
        # Never print raw observations or unknown extra-field names in diagnostics.
        known_fields = set(ForecastDataset.model_fields) | set(Observation.model_fields)
        errors = [
            {
                "field": ".".join(
                    str(part) if isinstance(part, int) or part in known_fields else "unknown_field"
                    for part in error["loc"]
                ),
                "message": error["msg"],
            }
            for error in exc.errors(include_input=False)[:50]
        ]
        print(json.dumps({"status": "invalid", "errors": errors}))
        raise SystemExit(1) from None
    except (OSError, UnicodeError, ValueError):
        print(
            json.dumps(
                {
                    "status": "invalid",
                    "message": "Could not read a bounded UTF-8 dataset JSON file.",
                }
            )
        )
        raise SystemExit(1) from None
    print(
        json.dumps(
            {"status": "ok", "schema_version": "1.0", "readiness": assess_readiness(dataset)},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
