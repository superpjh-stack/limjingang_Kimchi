"""SQLAlchemy 데이터베이스 설정 모듈."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLAlchemy 엔진 생성
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # 연결 전 ping으로 연결 상태 확인
    pool_recycle=3600,        # 1시간마다 연결 재생성 (MySQL timeout 방지)
    pool_size=10,             # 커넥션 풀 크기
    max_overflow=20,          # 최대 추가 연결 수
    echo=False,               # SQL 로깅 (개발 시 True)
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """SQLAlchemy 선언적 베이스 클래스."""
    pass


def get_db():
    """데이터베이스 세션 의존성 함수.

    FastAPI 의존성 주입에 사용됩니다.
    요청 처리 후 세션을 자동으로 닫습니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
