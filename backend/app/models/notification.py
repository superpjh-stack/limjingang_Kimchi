"""알림 모델 모듈.

테이블:
- TB_NOTIFICATION: 시스템 알림
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Notification(Base, TimestampMixin):
    """알림 모델 (TB_NOTIFICATION).

    시스템 상태 체크 결과로 자동 생성되거나 수동으로 등록하는 알림을 관리합니다.
    notification_type: STOCK_LOW / CCP_VIOLATION / EQUIPMENT_FAILURE / DELIVERY_RISK / SYSTEM
    severity: INFO / WARNING / DANGER
    """

    __tablename__ = "TB_NOTIFICATION"
    __table_args__ = {"comment": "알림 테이블"}

    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="알림 유형: STOCK_LOW/CCP_VIOLATION/EQUIPMENT_FAILURE/DELIVERY_RISK/SYSTEM",
    )
    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="INFO",
        comment="심각도: INFO/WARNING/DANGER",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="알림 제목",
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="알림 내용",
    )
    ref_table: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="관련 테이블",
    )
    ref_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=True,
        comment="관련 레코드 ID",
    )
    is_read: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="읽음 여부",
    )
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="읽은 일시",
    )
    read_by: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="읽은 사용자",
    )
