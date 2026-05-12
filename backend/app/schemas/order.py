"""수주 관련 Pydantic 스키마."""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 수주 상세 스키마
# ---------------------------------------------------------------------------

class OrderDetailCreate(BaseModel):
    """수주 상세 생성 스키마."""

    product_id: int = Field(..., description="제품 ID")
    order_qty: int = Field(..., gt=0, description="주문 수량")
    unit_price: int = Field(..., ge=0, description="단가 (원)")
    delivery_date: Optional[datetime] = Field(None, description="상세 납품 요청일")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class OrderDetailResponse(BaseModel):
    """수주 상세 응답 스키마."""

    id: int
    order_id: int
    product_id: int
    product_name: Optional[str] = None
    order_qty: int
    unit_price: int
    amount: int
    delivery_date: Optional[datetime] = None
    status: str
    shipped_qty: int
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_name(cls, detail: Any) -> "OrderDetailResponse":
        """ORM 객체에서 product_name 포함 응답 생성."""
        data = cls.model_validate(detail)
        if detail.product:
            data.product_name = detail.product.product_name
        return data


# ---------------------------------------------------------------------------
# 수주 헤더 스키마
# ---------------------------------------------------------------------------

class OrderCreate(BaseModel):
    """수주 생성 스키마."""

    customer_id: int = Field(..., description="고객 ID")
    order_date: datetime = Field(..., description="수주일")
    delivery_date: datetime = Field(..., description="납품 요청일")
    order_type: str = Field(..., description="수주 유형 (HOMESHOPPING/GENERAL)")
    delivery_address: Optional[str] = Field(None, max_length=500, description="납품지 주소")
    remark: Optional[str] = Field(None, description="비고")
    details: List[OrderDetailCreate] = Field(..., min_length=1, description="수주 상세 목록")


class OrderUpdate(BaseModel):
    """수주 수정 스키마 (DRAFT 상태에서만 허용)."""

    delivery_date: Optional[datetime] = None
    order_type: Optional[str] = None
    delivery_address: Optional[str] = Field(None, max_length=500)
    remark: Optional[str] = None
    status: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    """수주 상태 변경 스키마."""

    status: str = Field(..., description="변경할 상태")
    reason: Optional[str] = Field(None, description="변경 사유")


class OrderResponse(BaseModel):
    """수주 응답 스키마."""

    id: int
    order_no: str
    customer_id: int
    customer_name: Optional[str] = None
    order_date: datetime
    delivery_date: datetime
    order_type: str
    status: str
    total_qty: int
    total_amount: int
    delivery_address: Optional[str] = None
    remark: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[str] = None
    details: List[OrderDetailResponse] = []
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_full(cls, order: Any) -> "OrderResponse":
        """ORM 객체에서 customer_name, details 포함 응답 생성."""
        data = cls.model_validate(order)
        if order.customer:
            data.customer_name = order.customer.customer_name
        data.details = [
            OrderDetailResponse.from_orm_with_name(d) for d in order.details
        ]
        return data


# ---------------------------------------------------------------------------
# 수주 이력 스키마
# ---------------------------------------------------------------------------

class OrderHistoryResponse(BaseModel):
    """수주 변경 이력 응답 스키마."""

    id: int
    order_id: int
    changed_field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: Optional[str] = None
    changed_at: datetime
    changed_by: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# 공통 응답 스키마
# ---------------------------------------------------------------------------

class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None


class OrderListResponse(BaseModel):
    """수주 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: List[OrderResponse]
    total: int
