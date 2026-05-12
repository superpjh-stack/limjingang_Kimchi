"""원재료 모델 모듈.

테이블:
- TB_RAW_MATERIAL: 원재료 마스터 정보
"""

from decimal import Decimal

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class RawMaterial(Base, TimestampMixin):
    """원재료 모델 (TB_RAW_MATERIAL).

    김치 생산에 사용되는 모든 원재료를 관리합니다.
    배추, 고춧가루, 마늘, 생강, 젓갈류 등을 포함합니다.
    """

    __tablename__ = "TB_RAW_MATERIAL"
    __table_args__ = {"comment": "원재료 마스터 테이블"}

    material_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="원재료 코드",
    )
    material_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="원재료명",
    )
    material_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="원재료 유형 (VEGETABLE/SPICE/SEAFOOD/SALT/OTHER)",
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="kg",
        comment="단위 (kg/L/개)",
    )
    standard_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="기준 단가 (원/단위)",
    )
    safety_stock: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
        default=Decimal("0"),
        comment="안전 재고량",
    )
    origin: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="원산지",
    )
    supplier: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="주 공급업체",
    )
    storage_temp_min: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=True,
        comment="보관 온도 하한 (°C)",
    )
    storage_temp_max: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=True,
        comment="보관 온도 상한 (°C)",
    )
    shelf_life_days: Mapped[int] = mapped_column(
        Numeric(5, 0),
        nullable=True,
        comment="유통기한 (일)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )
    description: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        comment="원재료 설명",
    )

    # 관계
    bom_details: Mapped[list["BOMDetail"]] = relationship(  # type: ignore[name-defined]
        "BOMDetail",
        back_populates="raw_material",
    )
