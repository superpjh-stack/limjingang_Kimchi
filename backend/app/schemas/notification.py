"""알림 스키마 모듈."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    """알림 생성 스키마."""

    notification_type: str  # STOCK_LOW / CCP_VIOLATION / EQUIPMENT_FAILURE / DELIVERY_RISK / SYSTEM
    severity: str = "INFO"  # INFO / WARNING / DANGER
    title: str
    message: Optional[str] = None
    ref_table: Optional[str] = None
    ref_id: Optional[int] = None


class NotificationResponse(NotificationCreate):
    """알림 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_read: bool
    read_at: Optional[datetime] = None
    read_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class NotificationCountResponse(BaseModel):
    """알림 카운트 응답 스키마."""

    unread_count: int
    total_count: int
    danger_count: int
    warning_count: int


class NotificationListResponse(BaseModel):
    """알림 목록 응답 스키마."""

    success: bool
    message: str
    data: list[NotificationResponse]
    total: int
    unread_count: int
