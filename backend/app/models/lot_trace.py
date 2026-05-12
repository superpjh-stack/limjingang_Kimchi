"""LOT 추적 이력 모델 모듈.

테이블:
- TB_LOT_TRACE: LOT 추적 이력
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class LotTrace(Base, TimestampMixin):
    """LOT 추적 이력 모델 (TB_LOT_TRACE).

    원재료 입고부터 제품 출하까지 LOT 단위 이력을 추적합니다.
    trace_type: RECEIVE / PRODUCTION / PROCESS / SHIPMENT / QC
    """

    __tablename__ = "TB_LOT_TRACE"
    __table_args__ = {"comment": "LOT 추적 이력 테이블"}

    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="LOT 번호",
    )
    trace_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="이력 유형: RECEIVE/PRODUCTION/PROCESS/SHIPMENT/QC",
    )
    trace_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="이력 발생일시",
    )
    ref_table: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="참조 테이블명 (TB_MATERIAL_RECEIVE 등)",
    )
    ref_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=True,
        comment="참조 레코드 ID",
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("TB_PRODUCT.id", ondelete="SET NULL"),
        nullable=True,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    raw_material_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("TB_RAW_MATERIAL.id", ondelete="SET NULL"),
        nullable=True,
        comment="원재료 ID (FK → TB_RAW_MATERIAL)",
    )
    work_order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("TB_WORK_ORDER.id", ondelete="SET NULL"),
        nullable=True,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    quantity: Mapped[float] = mapped_column(
        Numeric(15, 3),
        nullable=True,
        comment="수량",
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="단위",
    )
    warehouse_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("TB_WAREHOUSE.id", ondelete="SET NULL"),
        nullable=True,
        comment="창고 ID (FK → TB_WAREHOUSE)",
    )
    process_name: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="공정명",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="이력 설명",
    )
    operator: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="작업자",
    )

    # 관계
    product: Mapped["Product"] = relationship(  # noqa: F821
        "Product",
        lazy="select",
        foreign_keys=[product_id],
    )
    raw_material: Mapped["RawMaterial"] = relationship(  # noqa: F821
        "RawMaterial",
        lazy="select",
        foreign_keys=[raw_material_id],
    )
    work_order: Mapped["WorkOrder"] = relationship(  # noqa: F821
        "WorkOrder",
        lazy="select",
        foreign_keys=[work_order_id],
    )
    warehouse: Mapped["Warehouse"] = relationship(  # noqa: F821
        "Warehouse",
        lazy="select",
        foreign_keys=[warehouse_id],
    )
