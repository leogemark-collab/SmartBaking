"""Local-only development server entry point."""

import uvicorn

from smartbaking_forecasting.config import Settings


def serve() -> None:
    settings = Settings()
    uvicorn.run(
        "smartbaking_forecasting.api:app",
        host=settings.host,
        port=settings.port,
    )
