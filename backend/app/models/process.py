"""공정 및 CCP(Critical Control Point) 기준 모델 모듈.

테이블:
- TB_PROCESS: 공정 마스터 정보
- TB_CCP_STANDARD: HACCP CCP 기준값
"""

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Process(Base, TimestampMixin):
    """공정 모델 (TB_PROCESS).

    김치 생산 공정(세척, 절임, 양념 혼합, 발효, 포장 등)을 정의합니다.
    HACCP 기준에 따라 CCP(중요 관리점)를 관리합니다.
    """

    __tablename__ = "TB_PROCESS"
    __table_args__ = {"comment": "공정 마스터 테이블"}

    process_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="공정 코드",
    )
    process_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="공정명",
    )
    process_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="공정 유형 (WASHING/SALTING/SEASONING/FERMENTATION/PACKAGING/QC)",
    )
    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="공정 순서",
    )
    is_ccp: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="CCP(중요 관리점) 여부",
    )
    standard_time_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="표준 작업 시간 (분)",
    )
    description: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        comment="공정 설명",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )

    # 관계
    ccp_standards: Mapped[list["CCPStandard"]] = relationship(
        "CCPStandard",
        back_populates="process",
        cascade="all, delete-orphan",
    )


class CCPStandard(Base, TimestampMixin):
    """CCP 기준값 모델 (TB_CCP_STANDARD).

    HACCP 기준에 따른 각 CCP 공정의 허용 범위를 정의합니다.
    온도, pH, 염도, 시간 등 측정 파라미터별 기준을 관리합니다.
    """

    __tablename__ = "TB_CCP_STANDARD"
    __table_args__ = {"comment": "CCP 관리 기준값 테이블"}

    process_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PROCESS.id", ondelete="CASCADE"),
        nullable=False,
        comment="공정 ID (FK → TB_PROCESS)",
    )
    parameter_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="측정 파라미터명 (예: 온도, pH, 염도)",
    )
    parameter_unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="단위 (예: °C, %, pH)",
    )
    min_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="허용 하한값",
    )
    max_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="허용 상한값",
    )
    target_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="목표값",
    )
    corrective_action: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        comment="이탈 시 시정 조치 방법",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )

    # 관계
    process: Mapped["Process"] = relationship("Process", back_populates="ccp_standards")
