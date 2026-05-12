"""OEE 스키마 모듈."""

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class OeeRecordCreate(BaseModel):
    """OEE 기록 생성/수정 스키마."""

    equipment_id: int
    record_date: date
    planned_time: int = 480
    downtime: int = 0
    actual_time: int
    ideal_cycle_time: Optional[float] = None
    total_count: int
    good_count: int
    defect_count: int = 0
    notes: Optional[str] = None


class OeeRecordResponse(OeeRecordCreate):
    """OEE 기록 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    availability: Optional[float] = None
    performance: Optional[float] = None
    quality: Optional[float] = None
    oee: Optional[float] = None
    equipment_name: Optional[str] = None  # 관계에서 채워짐
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class OeeRecordListResponse(BaseModel):
    """OEE 기록 목록 응답 스키마."""

    success: bool
    message: str
    data: list[OeeRecordResponse]
    total: int


class OeeDashboardResponse(BaseModel):
    """OEE 대시보드 응답 스키마."""

    summary: dict[str, Any]  # avg_oee, equipment_count, target_oee=85.0
    equipment_oee: list[dict[str, Any]]  # [{equipment_id, equipment_name, oee, availability, performance, quality}]
    trend: list[dict[str, Any]]  # 최근 30일 전체 평균 OEE 트렌드
