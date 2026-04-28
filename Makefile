.PHONY: help install dev dev-api dev-web build test lint clean db-up db-down db-migrate db-revision docker-up docker-down docker-logs

# Default target
help:
	@echo "MOLDURIZE WEB — Commands"
	@echo ""
	@echo "  make install       Install all dependencies (pnpm + pip)"
	@echo "  make dev           Start API + Web concurrently"
	@echo "  make dev-api       Start API only (port 8001)"
	@echo "  make dev-web       Start Web only (port 3000)"
	@echo ""
	@echo "  make build         Build the web app for production"
	@echo "  make test          Run all tests (pytest + Next lint)"
	@echo "  make lint          Run all linters"
	@echo ""
	@echo "  make db-up         Start PostgreSQL via docker"
	@echo "  make db-migrate    Run Alembic migrations"
	@echo "  make db-revision m='msg' Autogenerate a new migration"
	@echo ""
	@echo "  make docker-up     Start full stack (db + redis + api + web)"
	@echo "  make docker-down   Stop full stack"
	@echo "  make docker-logs   Tail docker logs"
	@echo ""
	@echo "  make clean         Remove caches and node_modules"

# ─── Install ──────────────────────────────────────────────────────────────
install:
	pnpm install
	cd apps/api && pip install -r requirements.txt

# ─── Development ──────────────────────────────────────────────────────────
dev:
	pnpm dev

dev-api:
	cd apps/api && uvicorn main:app --host 127.0.0.1 --port 8001 --reload

dev-web:
	cd apps/web && pnpm dev

# ─── Build / Lint / Test ──────────────────────────────────────────────────
build:
	cd apps/web && pnpm build

test:
	cd apps/api && pytest -v
	cd apps/web && pnpm lint

lint:
	cd apps/web && pnpm lint

# ─── Database ─────────────────────────────────────────────────────────────
db-up:
	docker compose up -d db

db-down:
	docker compose stop db

db-migrate:
	cd apps/api && alembic upgrade head

db-revision:
	cd apps/api && alembic revision --autogenerate -m "$(m)"

# ─── Docker ───────────────────────────────────────────────────────────────
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=100

# ─── Clean ────────────────────────────────────────────────────────────────
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".turbo" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
