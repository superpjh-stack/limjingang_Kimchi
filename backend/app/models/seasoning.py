"""양념버무림 공정 ORM 모델 모듈."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Float, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SeasoningBatch(Base):
    """TB_SEASONING_BATCH - 양념버무림 배치."""

    __tablename__ = "TB_SEASONING_BATCH"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_no: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, comment="MIX-YYYYMMDD-NNN"
    )
    product_code: Mapped[str] = mapped_column(String(20), nullable=False, comment="제품코드")
    product_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="제품명")
    planned_qty: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, comment="계획량 kg")
    actual_qty: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True, comment="실적량 kg"
    )
    recipe_code: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True, comment="레시피 코드"
    )
    recipe_compliance: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True, comment="레시피 준수율 %"
    )
    room_temp: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 1), nullable=True, comment="버무림실 온도 (CCP3)"
    )
    ccp3_pass: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1", comment="CCP3 합격여부"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="WAITING",
        server_default="WAITING",
        comment="WAITING/IN_PROGRESS/COMPLETED/ON_HOLD",
    )
    worker_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="작업자명")
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="비고")
    created_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system", server_default="system"
    )
    updated_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system", server_default="system"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
