"""고객 모델 모듈.

테이블:
- TB_CUSTOMER: 고객(거래처) 마스터 정보
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Customer(Base, TimestampMixin):
    """고객 모델 (TB_CUSTOMER).

    임진강김치의 거래처(홈쇼핑, 대형마트, 온라인몰 등)를 관리합니다.
    """

    __tablename__ = "TB_CUSTOMER"
    __table_args__ = {"comment": "고객(거래처) 마스터 테이블"}

    customer_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="고객 코드",
    )
    customer_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="고객(거래처)명",
    )
    customer_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="고객 유형 (HOMESHOPPING/MART/ONLINE/WHOLESALE/OTHER)",
    )
    business_number: Mapped[str] = mapped_column(String(20), name="business_no", nullable=True)
    representative: Mapped[str] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    fax: Mapped[str] = mapped_column(String(20), nullable=True)
    contact_person: Mapped[str] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[str] = mapped_column(String(255), name="email", nullable=True)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    payment_terms: Mapped[str] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str] = mapped_column(String(1000), nullable=True)
