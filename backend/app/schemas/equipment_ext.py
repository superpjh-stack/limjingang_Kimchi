"""설비 확장(점검·고장) 관련 Pydantic 스키마."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# 점검 (Inspection)
# ============================================================

class InspectionCreate(BaseModel):
    """점검 계획 등록 스키마."""

    equipment_id: int = Field(..., description="설비 ID")
    inspection_type: str = Field(
        ...,
        max_length=20,
        description="점검 유형 (DAILY/WEEKLY/MONTHLY/SPECIAL/EMERGENCY)",
    )
    scheduled_date: date = Field(..., description="점검 예정일")
    inspector: Optional[str] = Field(None, max_length=100, description="점검자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class InspectionUpdate(BaseModel):
    """점검 결과 입력 스키마."""

    actual_date: Optional[date] = Field(None, description="실제 점검일")
    status: Optional[str] = Field(
        None,
        max_length=20,
        description="점검 상태 (SCHEDULED/COMPLETED/SKIPPED/OVERDUE)",
    )
    result: Optional[str] = Field(
        None,
        max_length=20,
        description="점검 결과 (PASS/FAIL/CONDITIONAL)",
    )
    findings: Optional[str] = Field(None, description="점검 내용/발견사항")
    actions_taken: Optional[str] = Field(None, description="조치 내용")
    next_scheduled_date: Optional[date] = Field(None, description="다음 점검 예정일")
    inspector: Optional[str] = Field(None, max_length=100, description="점검자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class InspectionResponse(BaseModel):
    """점검 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    inspection_type: str
    scheduled_date: date
    actual_date: Optional[date] = None
    inspector: Optional[str] = None
    status: str
    result: Optional[str] = None
    findings: Optional[str] = None
    actions_taken: Optional[str] = None
    next_scheduled_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: str
    # 설비 정보 (조인)
    equipment_name: Optional[str] = Field(None, description="설비명")
    equipment_code: Optional[str] = Field(None, description="설비 코드")

    @classmethod
    def from_orm_with_equipment(cls, obj: Any) -> "InspectionResponse":
        """ORM 객체에서 설비 정보를 포함하여 생성합니다."""
        data = cls.model_validate(obj)
        if obj.equipment:
            data.equipment_name = obj.equipment.equipment_name
            data.equipment_code = obj.equipment.equipment_code
        return data


class InspectionListResponse(BaseModel):
    """점검 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[InspectionResponse]
    total: int


# ============================================================
# 고장 (Failure)
# ============================================================

class FailureCreate(BaseModel):
    """고장 등록 스키마."""

    equipment_id: int = Field(..., description="설비 ID")
    failure_date: datetime = Field(..., description="고장 발생일시")
    failure_type: Optional[str] = Field(
        None,
        max_length=50,
        description="고장 유형 (MECHANICAL/ELECTRICAL/SENSOR/SOFTWARE/OTHER)",
    )
    symptoms: str = Field(..., description="고장 증상")
    cause: Optional[str] = Field(None, description="고장 원인")
    impact_level: str = Field(
        "MEDIUM",
        max_length=20,
        description="영향도 (LOW/MEDIUM/HIGH/CRITICAL)",
    )
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class FailureUpdate(BaseModel):
    """고장 정보 수정 스키마."""

    cause: Optional[str] = Field(None, description="고장 원인")
    status: Optional[str] = Field(
        None,
        max_length=20,
        description="처리 상태 (OPEN/IN_REPAIR/RESOLVED/DEFERRED)",
    )
    resolved_date: Optional[datetime] = Field(None, description="복구 완료일시")
    repair_notes: Optional[str] = Field(None, description="수리 내용")
    downtime_hours: Optional[Decimal] = Field(None, ge=0, description="가동중지 시간(시간)")
    repaired_by: Optional[str] = Field(None, max_length=100, description="수리 담당자")
    impact_level: Optional[str] = Field(None, max_length=20, description="영향도")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class FailureResolveRequest(BaseModel):
    """고장 복구 완료 요청 스키마."""

    repair_notes: str = Field(..., description="수리 내용")
    downtime_hours: Decimal = Field(..., ge=0, description="가동중지 시간(시간)")
    repaired_by: str = Field(..., max_length=100, description="수리 담당자")


class FailureResponse(BaseModel):
    """고장 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    failure_no: str
    failure_date: datetime
    failure_type: Optional[str] = None
    symptoms: str
    cause: Optional[str] = None
    impact_level: str
    status: str
    resolved_date: Optional[datetime] = None
    repair_notes: Optional[str] = None
    downtime_hours: Optional[Decimal] = None
    repaired_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: str
    # 설비 정보 (조인)
    equipment_name: Optional[str] = Field(None, description="설비명")

    @classmethod
    def from_orm_with_equipment(cls, obj: Any) -> "FailureResponse":
        """ORM 객체에서 설비 정보를 포함하여 생성합니다."""
        data = cls.model_validate(obj)
        if obj.equipment:
            data.equipment_name = obj.equipment.equipment_name
        return data


class FailureListResponse(BaseModel):
    """고장 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[FailureResponse]
    total: int


# ============================================================
# 설비 상태 변경
# ============================================================

class EquipmentStatusUpdate(BaseModel):
    """설비 상태 변경 스키마."""

    status: str = Field(
        ...,
        max_length=20,
        description="변경할 상태 (RUNNING/IDLE/MAINTENANCE/BREAKDOWN)",
    )
    reason: Optional[str] = Field(None, max_length=500, description="상태 변경 사유")


# ============================================================
# 공통 응답
# ============================================================

class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
