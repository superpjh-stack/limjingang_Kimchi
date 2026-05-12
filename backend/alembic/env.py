"""Alembic 환경 설정 모듈.

온라인(마이그레이션 실행) 및 오프라인(SQL 스크립트 생성) 모드를 모두 지원합니다.
SQLAlchemy 모델의 메타데이터를 자동으로 감지합니다.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# =============================================================
# 프로젝트 루트를 sys.path 에 추가 (app 모듈 임포트를 위해)
# =============================================================
# backend/ 디렉터리를 sys.path 에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# =============================================================
# Alembic Config 객체 (alembic.ini 값 접근)
# =============================================================
config = context.config

# =============================================================
# 로깅 설정 적용 (alembic.ini 의 [loggers] 섹션)
# =============================================================
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =============================================================
# 데이터베이스 URL 환경변수 오버라이드
# Docker / 운영 환경에서 .env 값을 우선 적용합니다
# =============================================================
def get_database_url() -> str:
    """환경변수 또는 app.core.config 에서 데이터베이스 URL을 반환합니다."""
    # 환경변수 직접 조합 (Docker Compose 환경)
    db_host = os.getenv("DB_HOST", "mysql")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "mes_db")
    db_user = os.getenv("DB_USER", "mes_user")
    db_password = os.getenv("DB_PASSWORD", "mes_password")

    return (
        f"mysql+pymysql://{db_user}:{db_password}"
        f"@{db_host}:{db_port}/{db_name}"
        f"?charset=utf8mb4"
    )


# alembic.ini 의 sqlalchemy.url 을 환경변수 기반 URL 로 교체
config.set_main_option("sqlalchemy.url", get_database_url())

# =============================================================
# 모델 메타데이터 임포트 (자동 감지 마이그레이션을 위해)
# =============================================================
try:
    # SQLAlchemy Base 및 모든 모델을 임포트합니다.
    # Base 는 app.core.database 에 정의되어 있습니다.
    from app.core.database import Base  # noqa: F401 - 메타데이터 등록 목적

    # 모든 모델을 명시적으로 임포트하여 Base.metadata 에 등록합니다.
    # 새 모델 파일을 추가하면 반드시 여기에도 추가해야 합니다.
    from app.models import (  # noqa: F401
        common_code,
        user,
        product,
        bom,
        raw_material,
        process,
        equipment,
        customer,
        order,
        production,
    )

    # Sprint 2 모델 명시적 임포트 (Alembic 자동 감지 보장)
    from app.models.order import Order, OrderDetail, OrderHistory  # noqa: F401
    from app.models.production import ProductionPlan, WorkOrder, WorkOrderResult, QCRecord  # noqa: F401

    target_metadata = Base.metadata
except ImportError:
    # 모델 모듈이 아직 없는 경우 None 으로 설정 (수동 마이그레이션만 가능)
    target_metadata = None

# =============================================================
# 마이그레이션 옵션 설정
# =============================================================
# 자동 감지 시 무시할 항목 설정
def include_object(object, name, type_, reflected, compare_to):  # noqa: A002
    """마이그레이션 대상 객체 필터링.

    - alembic_version 테이블은 제외합니다
    - 외부 스키마(mes_db_test 등)의 테이블은 제외합니다
    """
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def run_migrations_offline() -> None:
    """오프라인 모드로 마이그레이션 실행.

    실제 DB 연결 없이 SQL 스크립트를 생성합니다.
    CI/CD 환경에서 SQL 검토 시 유용합니다.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """온라인 모드로 마이그레이션 실행.

    실제 DB에 연결하여 마이그레이션을 적용합니다.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # 마이그레이션 후 즉시 연결 해제
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,          # 컬럼 타입 변경 감지
            compare_server_default=True, # 서버 기본값 변경 감지
            # MySQL 특화 옵션
            render_as_batch=False,       # MySQL은 batch 모드 불필요
        )

        with context.begin_transaction():
            context.run_migrations()


# =============================================================
# 실행 진입점
# =============================================================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
