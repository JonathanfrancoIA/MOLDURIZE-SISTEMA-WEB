"""Tests for health endpoint."""


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "moldurize-api"
    assert "version" in data


def test_database_health_disabled_without_database_url(client, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    response = client.get("/health/db")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "disabled"
    assert data["database"] == {
        "configured": False,
        "connected": False,
        "migration_version": None,
    }


def test_database_health_connects_when_database_url_is_configured(client):
    response = client.get("/health/db")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["configured"] is True
    assert data["database"]["connected"] is True
    assert "migration_version" in data["database"]


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "MOLDURIZE API"
    assert data["docs"] == "/docs"
