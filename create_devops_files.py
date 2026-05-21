#!/usr/bin/env python3
"""
Generate DevOps configuration files for MOLDURIZE WEB project.
Ensures all required deployment and CI/CD files are created.
"""

import os
from pathlib import Path

# Project root
PROJECT_ROOT = Path(__file__).parent

# Files to create
FILES = {
    ".github/workflows/ci.yml": """name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # Backend (FastAPI) — pytest, linting, type checks
  # ═══════════════════════════════════════════════════════════════════════════
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./apps/api

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run pytest
        run: |
          pytest --cov=. --cov-report=xml

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
          flags: backend
          fail_ci_if_error: false

  # ═══════════════════════════════════════════════════════════════════════════
  # Frontend (Next.js) — pnpm install, type check, build
  # ═══════════════════════════════════════════════════════════════════════════
  frontend:
    name: Frontend Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.33.0

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm run lint
        continue-on-error: true

      - name: Build frontend
        run: pnpm run build
""",
    "railway.toml": """[build]
builder = "dockerfile"
dockerfile = "apps/api/Dockerfile"

[env]
ENVIRONMENT = "production"
LOG_LEVEL = "INFO"
PYTHONUNBUFFERED = "1"

[start]
cmd = "uvicorn main:app --host 0.0.0.0 --port $PORT"
""",
    "vercel.json": """{
  "version": 2,
  "buildCommand": "pnpm turbo run build --filter=web",
  "outputDirectory": "apps/web/.next/standalone",
  "installCommand": "pnpm install --frozen-lockfile",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "@next_public_api_url"
  },
  "envPrefix": "NEXT_PUBLIC_",
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
"""
}

def main():
    """Create all DevOps files."""
    created_files = []

    for file_path, content in FILES.items():
        full_path = PROJECT_ROOT / file_path

        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        created_files.append(str(full_path))
        print(f"Created: {file_path}")

    print(f"\nSuccessfully created {len(created_files)} files:")
    for f in created_files:
        print(f"  - {f}")

if __name__ == "__main__":
    main()
