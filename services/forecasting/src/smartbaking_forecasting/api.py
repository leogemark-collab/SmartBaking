"""A small, server-to-server API for checking this environment."""

from importlib.metadata import version
from secrets import compare_digest
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from smartbaking_forecasting import __version__
from smartbaking_forecasting.config import Settings

SERVICE_NAME = "smartbaking-forecasting"
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
PACKAGES = (
    "fastapi",
    "uvicorn",
    "pydantic-settings",
    "numpy",
    "pandas",
    "scipy",
    "statsmodels",
    "scikit-learn",
    "lightgbm",
    "holidays",
    "joblib",
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["smartbaking-forecasting"] = SERVICE_NAME
    version: str = __version__
    model_status: Literal["not_trained"] = "not_trained"


class CapabilityResponse(HealthResponse):
    libraries: dict[str, str]
    installed_model_families: list[str]
    holiday_country: Literal["PH"] = "PH"
    forecasting_endpoints_available: bool = False


def create_app(settings: Settings | None = None) -> FastAPI:
    """Inject settings explicitly in tests; keep credentials out of responses."""
    configuration = settings if settings is not None else Settings()
    application = FastAPI(
        title="SmartBaking forecasting environment",
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    def require_api_key(
        supplied: Annotated[str | None, Security(API_KEY_HEADER)],
    ) -> None:
        configured = configuration.api_key
        expected = configured.get_secret_value() if configured is not None else ""
        if not expected.strip() or expected == "replace-with-a-random-local-token":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service credential is not configured.",
            )
        if supplied is None or not compare_digest(supplied.encode(), expected.encode()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key.",
            )

    @application.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    @application.get(
        "/v1/capabilities",
        response_model=CapabilityResponse,
        dependencies=[Depends(require_api_key)],
    )
    def capabilities() -> CapabilityResponse:
        return CapabilityResponse(
            libraries={package: version(package) for package in PACKAGES},
            installed_model_families=["SARIMAX (statsmodels)", "LightGBM regression"],
        )

    return application


app = create_app()
