"""원재료 관련 Pydantic 스키마."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class RawMaterialBase(BaseModel):
    """원재료 공통 기본 스키마."""

    material_code: str = Field(..., max_length=50, description="원재료 코드")
    material_name: str = Field(..., max_length=200, description="원재료명")
    material_type: str = Field(
        ...,
        description="원재료 유형 (VEGETABLE/SPICE/SEAFOOD/SALT/OTHER)",
    )
    unit: str = Field("kg", max_length=20, description="단위")
    standard_price: Optional[Decimal] = Field(None, ge=0, description="기준 단가 (원/단위)")
    safety_stock: Decimal = Field(Decimal("0"), ge=0, description="안전 재고량")
    origin: Optional[str] = Field(None, max_length=100, description="원산지")
    supplier: Optional[str] = Field(None, max_length=200, description="주 공급업체")
    storage_temp_min: Optional[Decimal] = Field(None, description="보관 온도 하한 (°C)")
    storage_temp_max: Optional[Decimal] = Field(None, description="보관 온도 상한 (°C)")
    shelf_life_days: Optional[int] = Field(None, ge=0, description="유통기한 (일)")
    is_active: bool = Field(True, description="활성 여부")
    description: Optional[str] = Field(None, max_length=1000, description="원재료 설명")


class RawMaterialCreate(RawMaterialBase):
    """원재료 생성 스키마."""
    pass


class RawMaterialUpdate(BaseModel):
    """원재료 수정 스키마 (모든 필드 선택적)."""

    material_name: Optional[str] = Field(None, max_length=200)
    material_type: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=20)
    standard_price: Optional[Decimal] = Field(None, ge=0)
    safety_stock: Optional[Decimal] = Field(None, ge=0)
    origin: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=200)
    storage_temp_min: Optional[Decimal] = None
    storage_temp_max: Optional[Decimal] = None
    shelf_life_days: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=1000)


class RawMaterialResponse(RawMaterialBase):
    """원재료 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class RawMaterialListResponse(BaseModel):
    """원재료 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[RawMaterialResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
