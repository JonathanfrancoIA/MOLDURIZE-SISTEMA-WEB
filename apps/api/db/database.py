"""
MOLDURIZE WEB — Database Connection
SQLAlchemy engine + session factory
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from .schema import Base

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://moldurize:moldurize_dev@localhost:5432/moldurize"
)

# Sync engine (for MVP — upgrade to async in production)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=os.getenv("ENVIRONMENT") == "development",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables. Call on startup."""
    Base.metadata.create_all(bind=engine)
