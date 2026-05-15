"""세척공정 ORM 모델 모듈."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class WashingBatch(Base, TimestampMixin):
    """TB_WASHING_BATCH - 세척 배치."""

    __tablename__ = "TB_WASHING_BATCH"

    batch_no: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, comment="WASH-YYYYMMDD-NNN"
    )
    work_order_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, comment="TB_WORK_ORDER.id"
    )
    lot_no: Mapped[str] = mapped_column(String(30), nullable=False)
    material_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="CABBAGE/RADISH/GREEN_ONION/MUSTARD_GREEN/OTHER"
    )
    input_weight_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    water_temp_c: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False)
    wash_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    wash_duration_min: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    quality_grade: Mapped[Optional[str]] = mapped_column(
        String(5), nullable=True, comment="A/B/C"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="WAITING",
        server_default="WAITING",
        comment="WAITING/IN_PROGRESS/COMPLETED/ON_HOLD/DISCARDED",
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ForeignMatterLog(Base):
    """TB_FOREIGN_MATTER_LOG - 이물질 검출 이력."""

    __tablename__ = "TB_FOREIGN_MATTER_LOG"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, comment="TB_WASHING_BATCH.id"
    )
    matter_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="STONE/SOIL/INSECT/METAL/OTHER"
    )
    detection_point: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_taken: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="RE_WASH/DISCARD/ON_HOLD"
    )
    action_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    action_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    action_memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reported_by: Mapped[str] = mapped_column(String(50), nullable=False)
    reported_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class WashingStandard(Base):
    """TB_WASHING_STANDARD - 세척 기준 마스터."""

    __tablename__ = "TB_WASHING_STANDARD"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    material_type: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    material_name: Mapped[str] = mapped_column(String(50), nullable=False)
    min_wash_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    recommended_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    min_temp_c: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    max_temp_c: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    wash_method: Mapped[str] = mapped_column(String(200), nullable=False)
    haccp_ccp_code: Mapped[str] = mapped_column(
        String(20), nullable=False, default="CCP-W1", server_default="CCP-W1"
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="1")
