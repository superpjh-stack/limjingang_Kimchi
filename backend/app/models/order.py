"""수주 관련 모델 모듈.

테이블:
- TB_ORDER: 수주 헤더
- TB_ORDER_DETAIL: 수주 상세 (제품별)
- TB_ORDER_HISTORY: 수주 변경 이력 (감사 로그)
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Order(Base, TimestampMixin):
    """수주 헤더 모델 (TB_ORDER).

    고객으로부터 접수된 주문 정보를 관리합니다.
    홈쇼핑 / 일반 채널별로 구분하며, 상태 흐름을 추적합니다.
    """

    __tablename__ = "TB_ORDER"
    __table_args__ = {"comment": "수주 헤더 테이블"}

    order_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="수주번호 (ORD-YYYYMMDD-NNN)",
    )
    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_CUSTOMER.id", ondelete="RESTRICT"),
        nullable=False,
        comment="고객 ID (FK → TB_CUSTOMER)",
    )
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="수주일",
    )
    delivery_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="납품 요청일",
    )
    order_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="수주 유형 (HOMESHOPPING/GENERAL)",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
        comment="상태 (DRAFT/CONFIRMED/IN_PRODUCTION/SHIPPED/COMPLETED/CANCELLED)",
    )
    total_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="총 수량",
    )
    total_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="총 금액 (원)",
    )
    delivery_address: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="납품지 주소",
    )
    remark: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="확정일시",
    )
    confirmed_by: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="확정자 (username)",
    )

    # 관계
    customer: Mapped["Customer"] = relationship(  # type: ignore[name-defined]
        "Customer",
        lazy="joined",
    )
    details: Mapped[list["OrderDetail"]] = relationship(
        "OrderDetail",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    history: Mapped[list["OrderHistory"]] = relationship(
        "OrderHistory",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    production_plans: Mapped[list["ProductionPlan"]] = relationship(  # type: ignore[name-defined]
        "ProductionPlan",
        back_populates="order",
    )


class OrderDetail(Base, TimestampMixin):
    """수주 상세 모델 (TB_ORDER_DETAIL).

    수주 헤더에 속한 제품별 주문 내역을 관리합니다.
    """

    __tablename__ = "TB_ORDER_DETAIL"
    __table_args__ = {"comment": "수주 상세 테이블"}

    order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ORDER.id", ondelete="CASCADE"),
        nullable=False,
        comment="수주 ID (FK → TB_ORDER)",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    order_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="주문 수량",
    )
    unit_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="단가 (원)",
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="금액 (order_qty * unit_price)",
    )
    delivery_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="상세 납품 요청일 (헤더와 다를 경우)",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        comment="상태 (PENDING/IN_PRODUCTION/SHIPPED/COMPLETED)",
    )
    shipped_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="출하 수량",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    order: Mapped["Order"] = relationship("Order", back_populates="details")
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        lazy="joined",
    )


class OrderHistory(Base):
    """수주 변경 이력 모델 (TB_ORDER_HISTORY).

    수주의 모든 상태 변경 및 주요 필드 변경 이력을 기록합니다.
    TimestampMixin 미사용 — changed_at/changed_by 필드만 사용합니다.
    """

    __tablename__ = "TB_ORDER_HISTORY"
    __table_args__ = {"comment": "수주 변경 이력 테이블 (감사 로그)"}

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="기본키",
    )
    order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ORDER.id", ondelete="CASCADE"),
        nullable=False,
        comment="수주 ID (FK → TB_ORDER)",
    )
    changed_field: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="변경된 필드명",
    )
    old_value: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="변경 전 값",
    )
    new_value: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="변경 후 값",
    )
    change_reason: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="변경 사유",
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="변경일시",
    )
    changed_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="변경자 (username)",
    )

    # 관계
    order: Mapped["Order"] = relationship("Order", back_populates="history")
