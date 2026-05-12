"""설비 확장 모델 모듈.

테이블:
- TB_EQUIPMENT_INSPECTION: 설비 점검 계획/이력
- TB_EQUIPMENT_FAILURE: 설비 고장 기록
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.equipment import Equipment


class EquipmentInspection(Base, TimestampMixin):
    """설비 점검 모델 (TB_EQUIPMENT_INSPECTION).

    설비별 정기/비정기 점검 계획 등록 및 점검 결과 이력을 관리합니다.
    점검 유형: DAILY / WEEKLY / MONTHLY / SPECIAL / EMERGENCY
    점검 상태: SCHEDULED / COMPLETED / SKIPPED / OVERDUE
    """

    __tablename__ = "TB_EQUIPMENT_INSPECTION"
    __table_args__ = {"comment": "설비점검"}

    equipment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_EQUIPMENT.id"),
        nullable=False,
        comment="설비 ID (FK → TB_EQUIPMENT)",
    )
    inspection_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="점검 유형 (DAILY/WEEKLY/MONTHLY/SPECIAL/EMERGENCY)",
    )
    scheduled_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="점검 예정일",
    )
    actual_date: Mapped[date] = mapped_column(
        Date,
        nullable=True,
        comment="실제 점검일",
    )
    inspector: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="점검자",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SCHEDULED",
        comment="점검 상태 (SCHEDULED/COMPLETED/SKIPPED/OVERDUE)",
    )
    result: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="점검 결과 (PASS/FAIL/CONDITIONAL)",
    )
    findings: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="점검 내용/발견사항",
    )
    actions_taken: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="조치 내용",
    )
    next_scheduled_date: Mapped[date] = mapped_column(
        Date,
        nullable=True,
        comment="다음 점검 예정일",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    equipment: Mapped["Equipment"] = relationship(
        "Equipment",
        lazy="joined",
        foreign_keys=[equipment_id],
    )


class EquipmentFailure(Base, TimestampMixin):
    """설비 고장 모델 (TB_EQUIPMENT_FAILURE).

    설비 고장 발생 시 등록하며 수리 과정 및 복구 이력을 추적합니다.
    고장 번호 형식: FL-YYYYMMDD-NNN (자동 생성)
    영향도: LOW / MEDIUM / HIGH / CRITICAL
    상태: OPEN / IN_REPAIR / RESOLVED / DEFERRED
    """

    __tablename__ = "TB_EQUIPMENT_FAILURE"
    __table_args__ = {"comment": "설비고장"}

    equipment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_EQUIPMENT.id"),
        nullable=False,
        comment="설비 ID (FK → TB_EQUIPMENT)",
    )
    failure_no: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        comment="고장 번호 (FL-YYYYMMDD-NNN)",
    )
    failure_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="고장 발생일시",
    )
    failure_type: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="고장 유형 (MECHANICAL/ELECTRICAL/SENSOR/SOFTWARE/OTHER)",
    )
    symptoms: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="고장 증상",
    )
    cause: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="고장 원인",
    )
    impact_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM",
        comment="영향도 (LOW/MEDIUM/HIGH/CRITICAL)",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="OPEN",
        comment="처리 상태 (OPEN/IN_REPAIR/RESOLVED/DEFERRED)",
    )
    resolved_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="복구 완료일시",
    )
    repair_notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="수리 내용",
    )
    downtime_hours: Mapped[Decimal] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="가동중지 시간(시간)",
    )
    repaired_by: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="수리 담당자",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    equipment: Mapped["Equipment"] = relationship(
        "Equipment",
        lazy="joined",
        foreign_keys=[equipment_id],
    )
