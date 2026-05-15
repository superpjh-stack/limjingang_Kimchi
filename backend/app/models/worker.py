"""작업자(현장 인력) 모델 모듈.

테이블:
- TB_WORKER: 생산 현장 작업자 마스터

`TB_USER` 는 시스템 접근 사용자(로그인 계정)를, `TB_WORKER` 는 공정에 투입되는
현장 인력(반장/기능원/검사원 등)을 관리합니다. 두 테이블은 분리되어 있으나
필요 시 user_id FK 로 연결할 수 있도록 nullable 컬럼을 둡니다.
"""

from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Worker(Base, TimestampMixin):
    """작업자 모델 (TB_WORKER).

    프론트 `master/workers` 페이지의 Worker 타입을 직접 지원합니다.
    """

    __tablename__ = "TB_WORKER"
    __table_args__ = {"comment": "작업자(현장 인력) 마스터"}

    emp_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="사원번호 (예: EMP001)",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="작업자 이름",
    )
    department: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="부서(공정): 세척/절임/양념/포장/품질/출하/관리",
    )
    position: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="직급 (반장/기능원/검사원/관리자/사원)",
    )
    shift: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1조",
        comment="교대조 (1조/2조/3조)",
    )
    phone: Mapped[str] = mapped_column(
        String(30),
        nullable=True,
        comment="연락처",
    )
    hire_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="입사일",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="재직",
        comment="재직/휴직/퇴직",
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_USER.id", ondelete="SET NULL"),
        nullable=True,
        comment="시스템 사용자 연결 (선택)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )
    note: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )
