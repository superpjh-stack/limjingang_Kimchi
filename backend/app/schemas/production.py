"""생산계획 및 작업지시 관련 Pydantic 스키마."""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 생산계획 스키마
# ---------------------------------------------------------------------------

class ProductionPlanCreate(BaseModel):
    """생산계획 생성 스키마."""

    plan_date: datetime = Field(..., description="계획일")
    order_id: Optional[int] = Field(None, description="수주 ID (독립 계획 시 생략)")
    product_id: int = Field(..., description="제품 ID")
    bom_id: Optional[int] = Field(None, description="BOM ID")
    planned_qty: int = Field(..., gt=0, description="계획 수량")
    plan_type: str = Field("DAILY", description="계획 유형 (DAILY/WEEKLY)")
    start_datetime: Optional[datetime] = Field(None, description="계획 시작일시")
    end_datetime: Optional[datetime] = Field(None, description="계획 종료일시")
    remark: Optional[str] = Field(None, description="비고")


class ProductionPlanUpdate(BaseModel):
    """생산계획 수정 스키마 (모든 필드 선택적)."""

    plan_date: Optional[datetime] = None
    order_id: Optional[int] = None
    product_id: Optional[int] = None
    bom_id: Optional[int] = None
    planned_qty: Optional[int] = Field(None, gt=0)
    plan_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    remark: Optional[str] = None


class ProductionPlanResponse(BaseModel):
    """생산계획 응답 스키마."""

    id: int
    plan_no: str
    plan_date: datetime
    order_id: Optional[int] = None
    order_no: Optional[str] = None
    product_id: int
    product_name: Optional[str] = None
    bom_id: Optional[int] = None
    planned_qty: int
    actual_qty: int
    status: str
    plan_type: str
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    remark: Optional[str] = None
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_full(cls, plan: Any) -> "ProductionPlanResponse":
        """ORM 객체에서 관계 필드 포함 응답 생성."""
        data = cls.model_validate(plan)
        if plan.product:
            data.product_name = plan.product.product_name
        if plan.order:
            data.order_no = plan.order.order_no
        return data


# ---------------------------------------------------------------------------
# 작업지시 스키마
# ---------------------------------------------------------------------------

class WorkOrderCreate(BaseModel):
    """작업지시 생성 스키마."""

    production_plan_id: int = Field(..., description="생산계획 ID")
    product_id: int = Field(..., description="제품 ID")
    bom_id: Optional[int] = Field(None, description="BOM ID")
    process_id: Optional[int] = Field(None, description="공정 ID")
    equipment_id: Optional[int] = Field(None, description="설비 ID")
    assigned_user_id: Optional[int] = Field(None, description="담당 작업자 ID")
    work_date: datetime = Field(..., description="작업일")
    planned_qty: int = Field(..., gt=0, description="계획 수량")
    planned_start: Optional[datetime] = Field(None, description="계획 시작일시")
    planned_end: Optional[datetime] = Field(None, description="계획 종료일시")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호")
    remark: Optional[str] = Field(None, description="비고")


class WorkOrderUpdate(BaseModel):
    """작업지시 수정 스키마 (모든 필드 선택적)."""

    bom_id: Optional[int] = None
    process_id: Optional[int] = None
    equipment_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    work_date: Optional[datetime] = None
    planned_qty: Optional[int] = Field(None, gt=0)
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    lot_no: Optional[str] = Field(None, max_length=50)
    remark: Optional[str] = None


class WorkOrderResponse(BaseModel):
    """작업지시 응답 스키마."""

    id: int
    work_order_no: str
    production_plan_id: int
    product_id: int
    product_name: Optional[str] = None
    bom_id: Optional[int] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    equipment_id: Optional[int] = None
    equipment_name: Optional[str] = None
    assigned_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    work_date: datetime
    planned_qty: int
    actual_qty: int
    defect_qty: int
    status: str
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    lot_no: Optional[str] = None
    remark: Optional[str] = None
    issued_at: Optional[datetime] = None
    issued_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_full(cls, wo: Any) -> "WorkOrderResponse":
        """ORM 객체에서 관계 필드 포함 응답 생성."""
        data = cls.model_validate(wo)
        if wo.product:
            data.product_name = wo.product.product_name
        if wo.process:
            data.process_name = wo.process.process_name
        if wo.equipment:
            data.equipment_name = wo.equipment.equipment_name
        if wo.assigned_user:
            data.assigned_user_name = wo.assigned_user.full_name
        return data


# ---------------------------------------------------------------------------
# 작업실적 스키마
# ---------------------------------------------------------------------------

class WorkOrderResultCreate(BaseModel):
    """작업실적 입력 스키마."""

    actual_qty: int = Field(..., ge=0, description="실적 수량")
    defect_qty: int = Field(0, ge=0, description="불량 수량")
    defect_reason: Optional[str] = Field(None, max_length=500, description="불량 사유")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class WorkOrderResultResponse(BaseModel):
    """작업실적 응답 스키마."""

    id: int
    work_order_id: int
    result_seq: int
    actual_qty: int
    defect_qty: int
    defect_reason: Optional[str] = None
    recorded_at: datetime
    recorded_by: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# QC 검사 스키마
# ---------------------------------------------------------------------------

class QCRecordCreate(BaseModel):
    """QC 검사 결과 입력 스키마."""

    process_id: int = Field(..., description="공정 ID")
    ccp_standard_id: Optional[int] = Field(None, description="CCP 기준 ID")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호")
    measured_value: Optional[float] = Field(None, description="측정값")
    unit: Optional[str] = Field(None, max_length=20, description="단위")
    is_pass: Optional[bool] = Field(None, description="합격 여부")
    action_taken: Optional[str] = Field(None, max_length=500, description="시정 조치")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class QCRecordResponse(BaseModel):
    """QC 검사 결과 응답 스키마."""

    id: int
    work_order_id: Optional[int] = None
    process_id: int
    process_name: Optional[str] = None
    ccp_standard_id: Optional[int] = None
    lot_no: Optional[str] = None
    measured_value: Optional[float] = None
    unit: Optional[str] = None
    is_pass: Optional[bool] = None
    action_taken: Optional[str] = None
    inspected_at: datetime
    inspected_by: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_full(cls, qc: Any) -> "QCRecordResponse":
        """ORM 객체에서 process_name 포함 응답 생성."""
        data = cls.model_validate(qc)
        if qc.process:
            data.process_name = qc.process.process_name
        return data


# ---------------------------------------------------------------------------
# 공통 응답 스키마
# ---------------------------------------------------------------------------

class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None


class ProductionPlanListResponse(BaseModel):
    """생산계획 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: List[ProductionPlanResponse]
    total: int


class WorkOrderListResponse(BaseModel):
    """작업지시 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: List[WorkOrderResponse]
    total: int
