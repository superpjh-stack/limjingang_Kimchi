"""절임공정 ORM 모델 모듈."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SaltingBatch(Base):
    """TB_SALTING_BATCH - 절임 배치."""

    __tablename__ = "TB_SALTING_BATCH"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_no: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, comment="SALT-YYYYMMDD-NNN"
    )
    work_order_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    lot_no: Mapped[str] = mapped_column(String(30), nullable=False)
    material_type: Mapped[str] = mapped_column(String(20), nullable=False)
    input_weight_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    brine_concentration: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, comment="염수농도(%)"
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    elapsed_hours: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True, comment="절임 소요시간"
    )
    salinity_after: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True, comment="절임 후 염도(%)"
    )
    rinse_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=3)
    output_weight_kg: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    ccp_pass: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="1")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="IN_PROGRESS", server_default="IN_PROGRESS"
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    is_deleted: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="0")


class SaltingConcentrationLog(Base):
    """TB_SALTING_CONCENTRATION_LOG - 절임 농도 측정 이력."""

    __tablename__ = "TB_SALTING_CONCENTRATION_LOG"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    concentration: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    temperature: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)
    ph: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), nullable=True)
    ccp_pass: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="1")
    measured_by: Mapped[str] = mapped_column(String(50), nullable=False)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
