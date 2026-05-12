"""제품 관련 Pydantic 스키마."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """제품 공통 기본 스키마."""

    product_code: str = Field(..., max_length=50, description="제품 코드")
    product_name: str = Field(..., max_length=200, description="제품명")
    product_type: str = Field(
        ...,
        description="김치 종류 (BAECHU/CHONGGAK/YEOLMU/OTHER)",
    )
    capacity: Decimal = Field(..., gt=0, description="용량 (kg)")
    package_unit: str = Field(..., max_length=50, description="포장 단위")
    channel_type: str = Field(
        "GENERAL",
        description="판매 채널 (HOMESHOPPING/GENERAL/BOTH)",
    )
    unit_price: Decimal = Field(Decimal("0"), ge=0, description="단가 (원)")
    description: Optional[str] = Field(None, max_length=1000, description="제품 설명")
    is_active: bool = Field(True, description="활성 여부")


class ProductCreate(ProductBase):
    """제품 생성 스키마."""
    pass


class ProductUpdate(BaseModel):
    """제품 수정 스키마 (모든 필드 선택적)."""

    product_name: Optional[str] = Field(None, max_length=200)
    product_type: Optional[str] = None
    capacity: Optional[Decimal] = Field(None, gt=0)
    package_unit: Optional[str] = Field(None, max_length=50)
    channel_type: Optional[str] = None
    unit_price: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """제품 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    """제품 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[ProductResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
