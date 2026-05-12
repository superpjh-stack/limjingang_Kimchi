"""재고·출하 관련 모델 모듈.

테이블:
- TB_WAREHOUSE: 창고
- TB_MATERIAL_RECEIVE: 원자재 입고
- TB_MATERIAL_STOCK: 원자재 재고
- TB_MATERIAL_TRANSACTION: 원자재 입출고 이력
- TB_PRODUCT_STOCK: 완제품 재고
- TB_SHIPMENT: 출하 헤더
- TB_SHIPMENT_DETAIL: 출하 상세
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Warehouse(Base, TimestampMixin):
    """창고 모델 (TB_WAREHOUSE)."""

    __tablename__ = "TB_WAREHOUSE"
    __table_args__ = {"comment": "창고 테이블"}

    warehouse_code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="창고 코드",
    )
    warehouse_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="창고명",
    )
    warehouse_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="창고 유형 (MATERIAL/PRODUCT/COLD/FREEZE)",
    )
    location: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="위치",
    )
    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="용량",
    )
    temp_control: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="온도 관리 여부",
    )
    min_temp: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="최소 온도",
    )
    max_temp: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="최대 온도",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="사용 여부",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    material_stocks: Mapped[list["MaterialStock"]] = relationship(
        "MaterialStock",
        back_populates="warehouse",
    )


class MaterialReceive(Base, TimestampMixin):
    """원자재 입고 모델 (TB_MATERIAL_RECEIVE)."""

    __tablename__ = "TB_MATERIAL_RECEIVE"
    __table_args__ = {"comment": "원자재 입고 테이블"}

    receive_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="입고번호 (RCV-YYYYMMDD-NNN)",
    )
    raw_material_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_RAW_MATERIAL.id", ondelete="RESTRICT"),
        nullable=False,
        comment="원자재 ID (FK → TB_RAW_MATERIAL)",
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WAREHOUSE.id", ondelete="RESTRICT"),
        nullable=False,
        comment="창고 ID (FK → TB_WAREHOUSE)",
    )
    receive_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="입고일",
    )
    receive_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        comment="입고 수량",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="단가 (원)",
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="금액 (원)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    supplier: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="공급업체",
    )
    expiry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="유통기한",
    )
    qc_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
        comment="QC 상태 (PENDING/PASS/FAIL/SKIP)",
    )
    qc_notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="QC 메모",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    raw_material: Mapped["RawMaterial"] = relationship(  # type: ignore[name-defined]
        "RawMaterial",
        lazy="joined",
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        lazy="joined",
    )


class MaterialStock(Base, TimestampMixin):
    """원자재 재고 모델 (TB_MATERIAL_STOCK)."""

    __tablename__ = "TB_MATERIAL_STOCK"
    __table_args__ = {"comment": "원자재 재고 테이블"}

    raw_material_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_RAW_MATERIAL.id", ondelete="RESTRICT"),
        nullable=False,
        comment="원자재 ID (FK → TB_RAW_MATERIAL)",
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WAREHOUSE.id", ondelete="RESTRICT"),
        nullable=False,
        comment="창고 ID (FK → TB_WAREHOUSE)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    current_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        default=0,
        comment="현재 재고 수량",
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="단위",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="단가 (원)",
    )
    receive_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="입고일",
    )
    expiry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="유통기한",
    )
    supplier: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="공급업체",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    raw_material: Mapped["RawMaterial"] = relationship(  # type: ignore[name-defined]
        "RawMaterial",
        lazy="joined",
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="material_stocks",
        lazy="joined",
    )


class MaterialTransaction(Base, TimestampMixin):
    """원자재 입출고 이력 모델 (TB_MATERIAL_TRANSACTION)."""

    __tablename__ = "TB_MATERIAL_TRANSACTION"
    __table_args__ = {"comment": "원자재 입출고 이력 테이블"}

    raw_material_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_RAW_MATERIAL.id", ondelete="RESTRICT"),
        nullable=False,
        comment="원자재 ID (FK → TB_RAW_MATERIAL)",
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WAREHOUSE.id", ondelete="RESTRICT"),
        nullable=False,
        comment="창고 ID (FK → TB_WAREHOUSE)",
    )
    trans_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="거래 유형 (IN/OUT/ADJUST/RETURN)",
    )
    trans_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="거래일시",
    )
    trans_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        comment="거래 수량 (음수=출고)",
    )
    before_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        default=0,
        comment="변경 전 수량",
    )
    after_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        default=0,
        comment="변경 후 수량",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="단가 (원)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id", ondelete="SET NULL"),
        nullable=True,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    ref_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="참조번호",
    )
    reason: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="사유",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    raw_material: Mapped["RawMaterial"] = relationship(  # type: ignore[name-defined]
        "RawMaterial",
        lazy="joined",
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        lazy="joined",
    )


class ProductStock(Base, TimestampMixin):
    """완제품 재고 모델 (TB_PRODUCT_STOCK)."""

    __tablename__ = "TB_PRODUCT_STOCK"
    __table_args__ = {"comment": "완제품 재고 테이블"}

    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WAREHOUSE.id", ondelete="RESTRICT"),
        nullable=False,
        comment="창고 ID (FK → TB_WAREHOUSE)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    current_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        default=0,
        comment="현재 재고 수량",
    )
    production_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="생산일",
    )
    expiry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="유통기한",
    )
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id", ondelete="SET NULL"),
        nullable=True,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="단가 (원)",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        lazy="joined",
    )
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        lazy="joined",
    )


class Shipment(Base, TimestampMixin):
    """출하 헤더 모델 (TB_SHIPMENT)."""

    __tablename__ = "TB_SHIPMENT"
    __table_args__ = {"comment": "출하 헤더 테이블"}

    shipment_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="출하번호 (SHP-YYYYMMDD-NNN)",
    )
    order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ORDER.id", ondelete="SET NULL"),
        nullable=True,
        comment="수주 ID (FK → TB_ORDER)",
    )
    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_CUSTOMER.id", ondelete="RESTRICT"),
        nullable=False,
        comment="거래처 ID (FK → TB_CUSTOMER)",
    )
    shipment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="출하 예정일",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="READY",
        comment="상태 (READY/SHIPPED/DELIVERED/RETURNED)",
    )
    delivery_address: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="배송지 주소",
    )
    driver_name: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="운전기사",
    )
    vehicle_no: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="차량번호",
    )
    total_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        default=0,
        comment="총 출하 수량",
    )
    total_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="총 출하 금액 (원)",
    )
    shipped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="출하 확정일시",
    )
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="배달 완료일시",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    customer: Mapped["Customer"] = relationship(  # type: ignore[name-defined]
        "Customer",
        lazy="joined",
    )
    order: Mapped["Order"] = relationship(  # type: ignore[name-defined]
        "Order",
        lazy="joined",
    )
    details: Mapped[list["ShipmentDetail"]] = relationship(
        "ShipmentDetail",
        back_populates="shipment",
        cascade="all, delete-orphan",
    )


class ShipmentDetail(Base, TimestampMixin):
    """출하 상세 모델 (TB_SHIPMENT_DETAIL)."""

    __tablename__ = "TB_SHIPMENT_DETAIL"
    __table_args__ = {"comment": "출하 상세 테이블"}

    shipment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_SHIPMENT.id", ondelete="CASCADE"),
        nullable=False,
        comment="출하 ID (FK → TB_SHIPMENT)",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    order_detail_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ORDER_DETAIL.id", ondelete="SET NULL"),
        nullable=True,
        comment="수주상세 ID (FK → TB_ORDER_DETAIL)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    ship_qty: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False,
        comment="출하 수량",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="단가 (원)",
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="금액 (원)",
    )
    expiry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="유통기한",
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="details")
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        lazy="joined",
    )
