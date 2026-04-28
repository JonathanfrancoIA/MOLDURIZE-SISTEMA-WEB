"""
MOLDURIZE API — Test Configuration
Uses TestClient from FastAPI for synchronous testing.

Overrides the Clerk JWT auth dependency with a mock so tests can call
protected endpoints without real tokens.
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
from dependencies.auth import get_current_user_clerk_id


async def _mock_current_user_clerk_id() -> str:
    """Return a fake Clerk ID — enough for endpoints that only need an owner."""
    return "user_test_mock_clerk_id"


# Override the auth dependency for all tests
app.dependency_overrides[get_current_user_clerk_id] = _mock_current_user_clerk_id


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient — reused across all tests in the module."""
    with TestClient(app) as c:
        yield c
