"""LOT 추적 이력 스키마 모듈."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class LotTraceCreate(BaseModel):
    """LOT 이력 생성 스키마."""

    lot_no: str
    trace_type: str  # RECEIVE / PRODUCTION / PROCESS / SHIPMENT / QC
    trace_date: datetime
    ref_table: Optional[str] = None
    ref_id: Optional[int] = None
    product_id: Optional[int] = None
    raw_material_id: Optional[int] = None
    work_order_id: Optional[int] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    warehouse_id: Optional[int] = None
    process_name: Optional[str] = None
    description: Optional[str] = None
    operator: Optional[str] = None


class LotTraceResponse(LotTraceCreate):
    """LOT 이력 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class LotTraceListResponse(BaseModel):
    """LOT 이력 목록 응답 스키마."""

    success: bool
    message: str
    data: list[LotTraceResponse]
    total: int


class LotTimelineResponse(BaseModel):
    """LOT 번호의 전체 이력 타임라인 응답 스키마."""

    lot_no: str
    timeline: list[LotTraceResponse]
    summary: dict[str, Any]  # {total_events, first_event, last_event, trace_types}
