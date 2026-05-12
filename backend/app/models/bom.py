"""BOM(Bill of Materials) 모델 모듈.

테이블:
- TB_BOM: 레시피 BOM 헤더
- TB_BOM_DETAIL: BOM 구성 원재료 상세
"""

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class BOM(Base, TimestampMixin):
    """BOM 헤더 모델 (TB_BOM).

    제품별 레시피(원재료 구성)를 정의합니다.
    버전 관리를 통해 레시피 이력을 추적합니다.
    """

    __tablename__ = "TB_BOM"
    __table_args__ = {"comment": "BOM(레시피) 헤더 테이블"}

    bom_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="BOM 코드",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    bom_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="BOM 이름",
    )
    total_qty: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
        comment="기준 생산량 (kg)",
    )
    version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1.0",
        comment="BOM 버전",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부 (현재 사용 중인 레시피)",
    )
    description: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        comment="BOM 설명",
    )

    # 관계
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        back_populates="boms",
    )
    details: Mapped[list["BOMDetail"]] = relationship(
        "BOMDetail",
        back_populates="bom",
        cascade="all, delete-orphan",
    )


class BOMDetail(Base, TimestampMixin):
    """BOM 상세 모델 (TB_BOM_DETAIL).

    BOM을 구성하는 각 원재료의 투입량과 손실률을 정의합니다.
    """

    __tablename__ = "TB_BOM_DETAIL"
    __table_args__ = {"comment": "BOM 상세 원재료 구성 테이블"}

    bom_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_BOM.id", ondelete="CASCADE"),
        nullable=False,
        comment="BOM ID (FK → TB_BOM)",
    )
    raw_material_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_RAW_MATERIAL.id", ondelete="RESTRICT"),
        nullable=False,
        comment="원재료 ID (FK → TB_RAW_MATERIAL)",
    )
    required_qty: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
        comment="투입량 (kg) - 기준 생산량 대비",
    )
    loss_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0"),
        comment="손실률 (%)",
    )
    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="투입 순서",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고 (투입 방법 등)",
    )

    # 관계
    bom: Mapped["BOM"] = relationship("BOM", back_populates="details")
    raw_material: Mapped["RawMaterial"] = relationship(  # type: ignore[name-defined]
        "RawMaterial",
        back_populates="bom_details",
    )
