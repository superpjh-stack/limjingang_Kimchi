"""설비 관련 Pydantic 스키마."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class EquipmentBase(BaseModel):
    """설비 공통 기본 스키마."""

    equipment_code: str = Field(..., max_length=50, description="설비 코드")
    equipment_name: str = Field(..., max_length=200, description="설비명")
    equipment_type: str = Field(
        ...,
        description="설비 유형 (WASHING/SALTING/MIXING/PACKAGING/REFRIGERATION/OTHER)",
    )
    location: Optional[str] = Field(None, max_length=100, description="설비 위치")
    manufacturer: Optional[str] = Field(None, max_length=200, description="제조사")
    model_number: Optional[str] = Field(None, max_length=100, description="모델 번호")
    purchase_date: Optional[datetime] = Field(None, description="구매일")
    last_maintenance_date: Optional[datetime] = Field(None, description="최근 점검일")
    next_maintenance_date: Optional[datetime] = Field(None, description="다음 점검 예정일")
    status: str = Field("IDLE", description="현재 상태 (RUNNING/IDLE/MAINTENANCE/BREAKDOWN)")
    capacity_per_hour: Optional[Decimal] = Field(None, ge=0, description="시간당 처리 용량 (kg/h)")
    is_active: bool = Field(True, description="활성 여부")
    description: Optional[str] = Field(None, max_length=1000, description="설비 설명")


class EquipmentCreate(EquipmentBase):
    """설비 생성 스키마."""
    pass


class EquipmentUpdate(BaseModel):
    """설비 수정 스키마 (모든 필드 선택적)."""

    equipment_name: Optional[str] = Field(None, max_length=200)
    equipment_type: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    model_number: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    status: Optional[str] = None
    capacity_per_hour: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=1000)


class EquipmentResponse(EquipmentBase):
    """설비 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class EquipmentListResponse(BaseModel):
    """설비 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[EquipmentResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
