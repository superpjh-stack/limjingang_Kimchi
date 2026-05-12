"""OEE(설비종합효율) 기록 모델 모듈.

테이블:
- TB_OEE_RECORD: OEE 기록
"""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class OeeRecord(Base, TimestampMixin):
    """OEE 기록 모델 (TB_OEE_RECORD).

    설비별 일자별 OEE(Overall Equipment Effectiveness)를 기록합니다.
    OEE = 가용률(Availability) × 성능률(Performance) × 양품률(Quality)
    equipment_id + record_date 조합이 유니크합니다.
    """

    __tablename__ = "TB_OEE_RECORD"
    __table_args__ = {"comment": "OEE 기록 테이블"}

    equipment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_EQUIPMENT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="설비 ID (FK → TB_EQUIPMENT)",
    )
    record_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="기록 일자",
    )
    planned_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=480,
        comment="계획 가동 시간 (분, 기본 8시간)",
    )
    downtime: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="비가동 시간 (분)",
    )
    actual_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="실 가동 시간 (분)",
    )
    ideal_cycle_time: Mapped[float] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="이상 사이클 타임 (초/개)",
    )
    total_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="총 생산 수량",
    )
    good_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="양품 수량",
    )
    defect_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="불량 수량",
    )
    availability: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="가용률 (%)",
    )
    performance: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="성능률 (%)",
    )
    quality: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="양품률 (%)",
    )
    oee: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="OEE = 가용률 × 성능률 × 양품률 (%)",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    equipment: Mapped["Equipment"] = relationship(  # noqa: F821
        "Equipment",
        lazy="joined",
        foreign_keys=[equipment_id],
    )
