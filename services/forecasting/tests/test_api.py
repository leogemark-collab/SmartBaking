import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from smartbaking_forecasting.api import create_app
from smartbaking_forecasting.config import Settings

TEST_API_KEY = "test-only-api-key-never-use-in-deployment"


@pytest.fixture
def client():
    settings = Settings(_env_file=None, api_key=SecretStr(TEST_API_KEY))
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def test_health_is_public_and_honest_about_model_status(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "smartbaking-forecasting",
        "version": "0.1.0",
        "model_status": "not_trained",
    }


@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "wrong-key"}])
def test_capabilities_rejects_missing_or_wrong_credentials(client, headers):
    response = client.get("/v1/capabilities", headers=headers)
    assert response.status_code == 401
    assert TEST_API_KEY not in response.text


def test_capabilities_reports_installed_libraries_with_valid_key(client):
    response = client.get("/v1/capabilities", headers={"X-API-Key": TEST_API_KEY})
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ok"
    assert result["service"] == "smartbaking-forecasting"
    assert result["libraries"]["statsmodels"]
    assert result["libraries"]["lightgbm"]
    assert result["holiday_country"] == "PH"
    assert result["model_status"] == "not_trained"
    assert result["forecasting_endpoints_available"] is False
    assert TEST_API_KEY not in response.text


@pytest.mark.parametrize(
    "key", [None, SecretStr(""), SecretStr("replace-with-a-random-local-token")]
)
def test_unconfigured_key_fails_closed_but_health_still_works(key):
    settings = Settings(_env_file=None, api_key=key)
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/v1/capabilities").status_code == 503
