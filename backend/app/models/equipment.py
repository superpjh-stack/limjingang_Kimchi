"""설비 모델 모듈.

테이블:
- TB_EQUIPMENT: 설비 마스터 정보
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Equipment(Base, TimestampMixin):
    """설비 모델 (TB_EQUIPMENT).

    김치 생산에 사용되는 모든 설비(세척기, 절임조, 혼합기, 포장기 등)를 관리합니다.
    설비별 상태, 점검 이력, 가동 현황을 추적합니다.
    """

    __tablename__ = "TB_EQUIPMENT"
    __table_args__ = {"comment": "설비 마스터 테이블"}

    equipment_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="설비 코드",
    )
    equipment_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="설비명",
    )
    equipment_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="설비 유형 (WASHING/SALTING/MIXING/PACKAGING/REFRIGERATION/OTHER)",
    )
    location: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="설비 위치 (작업장)",
    )
    manufacturer: Mapped[str] = mapped_column(String(200), nullable=True)
    model_number: Mapped[str] = mapped_column(String(100), name="model_no", nullable=True)
    purchase_date: Mapped[datetime] = mapped_column(DateTime, name="install_date", nullable=True)
    last_maintenance_date: Mapped[datetime] = mapped_column(DateTime, name="last_inspect_date", nullable=True)
    next_maintenance_date: Mapped[datetime] = mapped_column(DateTime, name="next_inspect_date", nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="IDLE")
    capacity_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 3), name="capacity", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str] = mapped_column(String(1000), name="notes", nullable=True)
