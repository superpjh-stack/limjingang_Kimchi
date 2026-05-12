"""고객 관련 Pydantic 스키마."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    """고객 공통 기본 스키마."""

    customer_code: str = Field(..., max_length=50, description="고객 코드")
    customer_name: str = Field(..., max_length=200, description="고객(거래처)명")
    customer_type: str = Field(
        ...,
        description="고객 유형 (HOMESHOPPING/MART/ONLINE/WHOLESALE/OTHER)",
    )
    business_number: Optional[str] = Field(None, max_length=20, description="사업자등록번호")
    representative: Optional[str] = Field(None, max_length=100, description="대표자명")
    address: Optional[str] = Field(None, max_length=500, description="주소")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    fax: Optional[str] = Field(None, max_length=20, description="팩스번호")
    contact_person: Optional[str] = Field(None, max_length=100, description="담당자명")
    contact_email: Optional[str] = Field(None, max_length=255, description="담당자 이메일")
    contact_phone: Optional[str] = Field(None, max_length=20, description="담당자 연락처")
    payment_terms: Optional[str] = Field(None, max_length=200, description="결제 조건")
    is_active: bool = Field(True, description="활성 여부")
    notes: Optional[str] = Field(None, max_length=1000, description="비고")


class CustomerCreate(CustomerBase):
    """고객 생성 스키마."""
    pass


class CustomerUpdate(BaseModel):
    """고객 수정 스키마 (모든 필드 선택적)."""

    customer_name: Optional[str] = Field(None, max_length=200)
    customer_type: Optional[str] = None
    business_number: Optional[str] = Field(None, max_length=20)
    representative: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    fax: Optional[str] = Field(None, max_length=20)
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    payment_terms: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)


class CustomerResponse(CustomerBase):
    """고객 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    """고객 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[CustomerResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
