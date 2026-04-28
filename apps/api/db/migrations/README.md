# MOLDURIZE WEB — Database Migrations

## Setup Alembic

```bash
cd apps/api
pip install alembic
alembic init migrations
```

## Configure alembic.ini
Set `sqlalchemy.url = postgresql://moldurize:moldurize_dev@localhost:5432/moldurize`

## Configure migrations/env.py
```python
from db.schema import Base
target_metadata = Base.metadata
```

## Create first migration
```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

## For development (auto-create tables)
The app will auto-create tables on startup via `create_tables()`.
This is fine for MVP — use proper migrations for production.
