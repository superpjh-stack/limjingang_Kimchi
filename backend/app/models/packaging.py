"""포장출하 공정 ORM 모델 모듈."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PackagingBatch(Base):
    """TB_PACKAGING_BATCH - 포장출하 배치."""

    __tablename__ = "TB_PACKAGING_BATCH"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_no: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, comment="PKG-YYYYMMDD-NNN"
    )
    product_code: Mapped[str] = mapped_column(String(20), nullable=False, comment="제품코드")
    product_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="제품명")
    package_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="bag/container/commercial"
    )
    planned_qty: Mapped[int] = mapped_column(Integer, nullable=False, comment="계획 수량")
    completed_qty: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0", comment="완료 수량"
    )
    defect_qty: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0", comment="불량 수량"
    )
    defect_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.0, server_default="0.00", comment="불량률 %"
    )
    ready_to_ship: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0", comment="출하준비 여부"
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
