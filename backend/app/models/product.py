"""제품 모델 모듈.

테이블:
- TB_PRODUCT: 제품 마스터 정보
"""

from decimal import Decimal

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Product(Base, TimestampMixin):
    """제품 모델 (TB_PRODUCT).

    임진강김치에서 생산하는 모든 제품의 마스터 정보를 관리합니다.
    배추김치, 총각김치, 열무김치 등 품목별로 용량과 채널을 관리합니다.
    """

    __tablename__ = "TB_PRODUCT"
    __table_args__ = {"comment": "제품 마스터 테이블"}

    product_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="제품 코드 (예: BAECHU-5KG-HOME)",
    )
    product_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="제품명",
    )
    product_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="김치 종류 (BAECHU/CHONGGAK/YEOLMU/OTHER)",
    )
    capacity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
        comment="용량 (kg)",
    )
    package_unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="포장 단위 (예: 5kg 포대)",
    )
    channel_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="GENERAL",
        comment="판매 채널 (HOMESHOPPING/GENERAL/BOTH)",
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        nullable=False,
        default=Decimal("0"),
        comment="단가 (원)",
    )
    description: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        comment="제품 설명",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )

    # 관계
    boms: Mapped[list["BOM"]] = relationship(  # type: ignore[name-defined]
        "BOM",
        back_populates="product",
    )
