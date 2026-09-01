"""
Setup koneksi database untuk Chemistry Student Analyzer.
Pakai SQLite biar simpel untuk development & skripsi (sesuai tech stack: SQLAlchemy + SQLite).
"""
from dotenv import load_dotenv
load_dotenv()  # baca .env (GROQ_API_KEY, JWT_SECRET_KEY, dll) - taruh di sini biar dijalankan paling awal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./chemistry_analyzer.db"

# check_same_thread=False dibutuhkan khusus untuk SQLite + FastAPI
# (FastAPI bisa handle request di thread berbeda)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency untuk FastAPI endpoint - buka session, tutup otomatis setelah request selesai."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
