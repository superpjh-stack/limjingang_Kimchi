"""BOM 관련 Pydantic 스키마."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class BOMDetailBase(BaseModel):
    """BOM 상세 공통 기본 스키마."""

    raw_material_id: int = Field(..., description="원재료 ID")
    required_qty: Decimal = Field(..., gt=0, description="투입량 (kg)")
    loss_rate: Decimal = Field(Decimal("0"), ge=0, le=100, description="손실률 (%)")
    sequence: int = Field(1, ge=1, description="투입 순서")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class BOMDetailCreate(BOMDetailBase):
    """BOM 상세 생성 스키마."""
    pass


class BOMDetailUpdate(BaseModel):
    """BOM 상세 수정 스키마 (모든 필드 선택적)."""

    raw_material_id: Optional[int] = None
    required_qty: Optional[Decimal] = Field(None, gt=0)
    loss_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    sequence: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = Field(None, max_length=500)


class BOMDetailResponse(BOMDetailBase):
    """BOM 상세 응답 스키마."""

    id: int
    bom_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BOMBase(BaseModel):
    """BOM 헤더 공통 기본 스키마."""

    bom_code: str = Field(..., max_length=50, description="BOM 코드")
    product_id: int = Field(..., description="제품 ID")
    bom_name: str = Field(..., max_length=200, description="BOM 이름")
    total_qty: Decimal = Field(..., gt=0, description="기준 생산량 (kg)")
    version: str = Field("1.0", max_length=20, description="BOM 버전")
    is_active: bool = Field(True, description="활성 여부")
    description: Optional[str] = Field(None, max_length=1000, description="BOM 설명")


class BOMCreate(BOMBase):
    """BOM 생성 스키마."""

    details: Optional[list[BOMDetailCreate]] = Field(
        default_factory=list,
        description="BOM 구성 원재료 목록",
    )


class BOMUpdate(BaseModel):
    """BOM 수정 스키마 (모든 필드 선택적)."""

    bom_name: Optional[str] = Field(None, max_length=200)
    total_qty: Optional[Decimal] = Field(None, gt=0)
    version: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=1000)


class BOMResponse(BOMBase):
    """BOM 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    details: list[BOMDetailResponse] = []

    model_config = {"from_attributes": True}


class BOMListResponse(BaseModel):
    """BOM 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[BOMResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
