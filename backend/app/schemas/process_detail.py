"""공정별 특화 실적 Pydantic 스키마 (Sprint 5).

각 공정별 Create/Update/Response 스키마와 CCP 합격 판정 자동계산 포함.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------------------------------------------------------------------------
# 세척 실적 스키마
# CCP: wash_water_temp 1~15°C, wash_water_ph 6.5~8.5
# ---------------------------------------------------------------------------

class WashRecordCreate(BaseModel):
    """세척 실적 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    wash_water_temp: Optional[float] = Field(None, description="세척수 온도(°C) CCP: 1~15")
    wash_pressure: Optional[float] = Field(None, ge=0, description="세척압력(kg/cm²)")
    wash_duration: Optional[int] = Field(None, ge=0, description="세척시간(분)")
    wash_water_ph: Optional[float] = Field(None, description="세척수 pH CCP: 6.5~8.5")
    input_weight: Optional[float] = Field(None, ge=0, description="투입중량(kg)")
    output_weight: Optional[float] = Field(None, ge=0, description="세척후중량(kg)")
    foreign_matter: bool = Field(False, description="이물질 발견여부")
    foreign_detail: Optional[str] = Field(None, max_length=200, description="이물질 내용")
    recorded_by: Optional[str] = Field(None, max_length=50, description="기록자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class WashRecordUpdate(BaseModel):
    """세척 실적 수정 스키마 (모든 필드 선택적)."""

    wash_water_temp: Optional[float] = None
    wash_pressure: Optional[float] = None
    wash_duration: Optional[int] = None
    wash_water_ph: Optional[float] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    foreign_matter: Optional[bool] = None
    foreign_detail: Optional[str] = None
    wash_result: Optional[str] = None
    notes: Optional[str] = None


class WashRecordResponse(BaseModel):
    """세척 실적 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    work_order_no: Optional[str] = None
    wash_water_temp: Optional[float] = None
    wash_pressure: Optional[float] = None
    wash_duration: Optional[int] = None
    wash_water_ph: Optional[float] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    yield_rate: Optional[float] = None  # output/input*100
    foreign_matter: bool
    foreign_detail: Optional[str] = None
    wash_result: str
    ccp_pass: bool = True
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    @model_validator(mode="after")
    def compute_derived(self) -> "WashRecordResponse":
        """CCP 합격 여부 및 수율 자동 계산."""
        # CCP 판정: 온도 1~15°C, pH 6.5~8.5 중 하나라도 이탈 시 FAIL
        ccp_ok = True
        if self.wash_water_temp is not None:
            if not (1.0 <= self.wash_water_temp <= 15.0):
                ccp_ok = False
        if self.wash_water_ph is not None:
            if not (6.5 <= self.wash_water_ph <= 8.5):
                ccp_ok = False
        self.ccp_pass = ccp_ok

        # 수율 계산
        if self.input_weight and self.output_weight and self.input_weight > 0:
            self.yield_rate = round(self.output_weight / self.input_weight * 100, 2)

        return self

    @classmethod
    def from_orm_with_wo(cls, record) -> "WashRecordResponse":
        obj = cls.model_validate(record)
        if record.work_order:
            obj.work_order_no = record.work_order.work_order_no
        return obj


# ---------------------------------------------------------------------------
# 절임 실적 스키마
# CCP: brine_concentration 15~20%, salting_duration 360~1080분, salinity_result 2.5~3.0%
# ---------------------------------------------------------------------------

class SaltingRecordCreate(BaseModel):
    """절임 실적 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    brine_concentration: Optional[float] = Field(None, description="염수농도(%) CCP: 15~20")
    salting_start_time: Optional[datetime] = Field(None, description="절임 시작일시")
    salting_end_time: Optional[datetime] = Field(None, description="절임 완료일시")
    input_weight: Optional[float] = Field(None, ge=0, description="절임전 배추중량(kg)")
    output_weight: Optional[float] = Field(None, ge=0, description="절임후중량(kg)")
    salinity_result: Optional[float] = Field(None, description="절임 후 염도(%) CCP: 2.5~3.0")
    water_rinse_count: int = Field(3, ge=0, description="탈수 세척 횟수")
    recorded_by: Optional[str] = Field(None, max_length=50, description="기록자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class SaltingRecordUpdate(BaseModel):
    """절임 실적 수정 스키마."""

    brine_concentration: Optional[float] = None
    salting_start_time: Optional[datetime] = None
    salting_end_time: Optional[datetime] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    salinity_result: Optional[float] = None
    water_rinse_count: Optional[int] = None
    salting_result: Optional[str] = None
    notes: Optional[str] = None


class SaltingRecordResponse(BaseModel):
    """절임 실적 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    work_order_no: Optional[str] = None
    brine_concentration: Optional[float] = None
    salting_start_time: Optional[datetime] = None
    salting_end_time: Optional[datetime] = None
    salting_duration: Optional[int] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    yield_rate: Optional[float] = None
    salinity_result: Optional[float] = None
    water_rinse_count: int
    salting_result: str
    ccp_pass: bool = True
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    @model_validator(mode="after")
    def compute_derived(self) -> "SaltingRecordResponse":
        """CCP 합격 여부, 절임시간, 수율 자동 계산."""
        ccp_ok = True
        if self.brine_concentration is not None:
            if not (15.0 <= self.brine_concentration <= 20.0):
                ccp_ok = False
        if self.salting_duration is not None:
            if not (360 <= self.salting_duration <= 1080):
                ccp_ok = False
        if self.salinity_result is not None:
            if not (2.5 <= self.salinity_result <= 3.0):
                ccp_ok = False
        self.ccp_pass = ccp_ok

        # 수율
        if self.input_weight and self.output_weight and self.input_weight > 0:
            self.yield_rate = round(self.output_weight / self.input_weight * 100, 2)

        return self

    @classmethod
    def from_orm_with_wo(cls, record) -> "SaltingRecordResponse":
        obj = cls.model_validate(record)
        if record.work_order:
            obj.work_order_no = record.work_order.work_order_no
        return obj


# ---------------------------------------------------------------------------
# 양념버무림 실적 스키마
# CCP: mix_temperature -2~10°C
# ---------------------------------------------------------------------------

class SeasoningRecordCreate(BaseModel):
    """양념버무림 실적 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    seasoning_ratio: Optional[float] = Field(None, ge=0, description="양념배합비(%) 양념/배추")
    mix_temperature: Optional[float] = Field(None, description="혼합온도(°C) CCP: -2~10")
    mix_duration: Optional[int] = Field(None, ge=0, description="혼합시간(분)")
    garlic_amount: Optional[float] = Field(None, ge=0, description="마늘함량(g/kg)")
    pepper_amount: Optional[float] = Field(None, ge=0, description="고추가루함량(g/kg)")
    ginger_amount: Optional[float] = Field(None, ge=0, description="생강함량(g/kg)")
    input_weight: Optional[float] = Field(None, ge=0, description="투입중량(kg)")
    output_weight: Optional[float] = Field(None, ge=0, description="버무림후중량(kg)")
    lot_no: Optional[str] = Field(None, max_length=30, description="생산 LOT 번호")
    recorded_by: Optional[str] = Field(None, max_length=50, description="기록자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class SeasoningRecordUpdate(BaseModel):
    """양념버무림 실적 수정 스키마."""

    seasoning_ratio: Optional[float] = None
    mix_temperature: Optional[float] = None
    mix_duration: Optional[int] = None
    garlic_amount: Optional[float] = None
    pepper_amount: Optional[float] = None
    ginger_amount: Optional[float] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    seasoning_result: Optional[str] = None
    lot_no: Optional[str] = None
    notes: Optional[str] = None


class SeasoningRecordResponse(BaseModel):
    """양념버무림 실적 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    work_order_no: Optional[str] = None
    seasoning_ratio: Optional[float] = None
    mix_temperature: Optional[float] = None
    mix_duration: Optional[int] = None
    garlic_amount: Optional[float] = None
    pepper_amount: Optional[float] = None
    ginger_amount: Optional[float] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    yield_rate: Optional[float] = None
    seasoning_result: str
    lot_no: Optional[str] = None
    ccp_pass: bool = True
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    @model_validator(mode="after")
    def compute_derived(self) -> "SeasoningRecordResponse":
        """CCP 합격 여부, 수율 자동 계산."""
        ccp_ok = True
        if self.mix_temperature is not None:
            if not (-2.0 <= self.mix_temperature <= 10.0):
                ccp_ok = False
        self.ccp_pass = ccp_ok

        if self.input_weight and self.output_weight and self.input_weight > 0:
            self.yield_rate = round(self.output_weight / self.input_weight * 100, 2)

        return self

    @classmethod
    def from_orm_with_wo(cls, record) -> "SeasoningRecordResponse":
        obj = cls.model_validate(record)
        if record.work_order:
            obj.work_order_no = record.work_order.work_order_no
        return obj


# ---------------------------------------------------------------------------
# 포장 실적 스키마
# CCP: metal_detect_result PASS 필수, 중량 허용오차 ±3%
# ---------------------------------------------------------------------------

class PackagingRecordCreate(BaseModel):
    """포장 실적 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    target_weight: Optional[float] = Field(None, ge=0, description="목표 포장중량(g)")
    actual_weight_avg: Optional[float] = Field(None, ge=0, description="실측 평균중량(g)")
    weight_tolerance: float = Field(3.0, ge=0, description="허용오차(%)")
    total_packages: Optional[int] = Field(None, ge=0, description="총 포장수량(개/박스)")
    defect_packages: int = Field(0, ge=0, description="불량 포장수(개)")
    metal_detect_result: str = Field("PASS", description="금속검출결과: PASS/FAIL")
    seal_quality: str = Field("GOOD", description="실링상태: GOOD/POOR/FAIL")
    label_check: bool = Field(True, description="라벨 부착 확인")
    expiry_date_set: Optional[date] = Field(None, description="유통기한 설정일")
    lot_no: Optional[str] = Field(None, max_length=30, description="생산 LOT 번호")
    recorded_by: Optional[str] = Field(None, max_length=50, description="기록자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class PackagingRecordUpdate(BaseModel):
    """포장 실적 수정 스키마."""

    target_weight: Optional[float] = None
    actual_weight_avg: Optional[float] = None
    weight_tolerance: Optional[float] = None
    total_packages: Optional[int] = None
    defect_packages: Optional[int] = None
    metal_detect_result: Optional[str] = None
    seal_quality: Optional[str] = None
    label_check: Optional[bool] = None
    expiry_date_set: Optional[date] = None
    lot_no: Optional[str] = None
    packaging_result: Optional[str] = None
    notes: Optional[str] = None


class PackagingRecordResponse(BaseModel):
    """포장 실적 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    work_order_no: Optional[str] = None
    target_weight: Optional[float] = None
    actual_weight_avg: Optional[float] = None
    weight_tolerance: float
    total_packages: Optional[int] = None
    defect_packages: int
    defect_rate: Optional[float] = None
    metal_detect_result: str
    seal_quality: str
    label_check: bool
    expiry_date_set: Optional[date] = None
    lot_no: Optional[str] = None
    packaging_result: str
    ccp_pass: bool = True
    weight_in_tolerance: Optional[bool] = None
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    @model_validator(mode="after")
    def compute_derived(self) -> "PackagingRecordResponse":
        """불량률, 중량 허용오차 초과 여부, CCP 합격 자동 계산."""
        # 불량률
        if self.total_packages and self.total_packages > 0:
            self.defect_rate = round(self.defect_packages / self.total_packages * 100, 2)

        # 중량 허용오차 확인
        if self.target_weight and self.actual_weight_avg:
            deviation = abs(self.actual_weight_avg - self.target_weight) / self.target_weight * 100
            self.weight_in_tolerance = deviation <= self.weight_tolerance

        # CCP: 금속검출 FAIL → 전체 FAIL
        ccp_ok = self.metal_detect_result == "PASS"
        if self.weight_in_tolerance is False:
            ccp_ok = False
        self.ccp_pass = ccp_ok

        return self

    @classmethod
    def from_orm_with_wo(cls, record) -> "PackagingRecordResponse":
        obj = cls.model_validate(record)
        if record.work_order:
            obj.work_order_no = record.work_order.work_order_no
        return obj


# ---------------------------------------------------------------------------
# 입고전처리 실적 스키마
# ---------------------------------------------------------------------------

class PreprocessRecordCreate(BaseModel):
    """입고전처리 실적 생성 스키마."""

    work_order_id: Optional[int] = Field(None, description="작업지시 ID (독립 기록 시 생략)")
    raw_material_id: int = Field(..., description="원재료 ID")
    receive_date: date = Field(..., description="입고일")
    input_weight: float = Field(..., gt=0, description="투입중량(kg)")
    reject_weight: float = Field(0.0, ge=0, description="불합격중량(kg)")
    storage_temp: Optional[float] = Field(None, description="보관온도(°C)")
    foreign_matter_removed: bool = Field(True, description="이물질제거여부")
    pre_wash_done: bool = Field(True, description="세척여부")
    reject_reason: Optional[str] = Field(None, max_length=200, description="불합격 사유")
    recorded_by: Optional[str] = Field(None, max_length=50, description="기록자")
    notes: Optional[str] = Field(None, max_length=500, description="비고")


class PreprocessRecordUpdate(BaseModel):
    """입고전처리 실적 수정 스키마."""

    input_weight: Optional[float] = None
    reject_weight: Optional[float] = None
    storage_temp: Optional[float] = None
    foreign_matter_removed: Optional[bool] = None
    pre_wash_done: Optional[bool] = None
    reject_reason: Optional[str] = None
    notes: Optional[str] = None


class PreprocessRecordResponse(BaseModel):
    """입고전처리 실적 응답 스키마."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: Optional[int] = None
    work_order_no: Optional[str] = None
    raw_material_id: int
    raw_material_name: Optional[str] = None
    receive_date: date
    input_weight: float
    reject_weight: float
    pass_weight: Optional[float] = None
    reject_rate: Optional[float] = None
    storage_temp: Optional[float] = None
    foreign_matter_removed: bool
    pre_wash_done: bool
    reject_reason: Optional[str] = None
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    @model_validator(mode="after")
    def compute_derived(self) -> "PreprocessRecordResponse":
        """합격중량 및 불합격률 자동 계산."""
        if self.pass_weight is None:
            self.pass_weight = round(self.input_weight - self.reject_weight, 2)
        if self.input_weight > 0:
            self.reject_rate = round(self.reject_weight / self.input_weight * 100, 2)
        return self

    @classmethod
    def from_orm_with_relations(cls, record) -> "PreprocessRecordResponse":
        obj = cls.model_validate(record)
        if record.work_order:
            obj.work_order_no = record.work_order.work_order_no
        if record.raw_material:
            obj.raw_material_name = record.raw_material.material_name
        return obj


# ---------------------------------------------------------------------------
# 공정별 실적 집계 응답 스키마
# ---------------------------------------------------------------------------

class ProcessSummaryItem(BaseModel):
    """일별 공정 실적 집계 항목."""

    process_type: str
    record_date: date
    record_count: int
    total_input_weight: Optional[float] = None
    total_output_weight: Optional[float] = None
    avg_yield_rate: Optional[float] = None
    ccp_violation_count: int = 0


class ProcessSummaryResponse(BaseModel):
    """공정별 실적 집계 응답."""

    success: bool = True
    message: str
    data: list[ProcessSummaryItem]
    total: int


class CCPViolationItem(BaseModel):
    """CCP 이탈 항목."""

    process_type: str
    record_id: int
    work_order_id: Optional[int] = None
    work_order_no: Optional[str] = None
    violation_field: str
    measured_value: Optional[float] = None
    ccp_min: Optional[float] = None
    ccp_max: Optional[float] = None
    recorded_at: datetime
    recorded_by: Optional[str] = None


class CCPViolationResponse(BaseModel):
    """CCP 이탈 현황 응답."""

    success: bool = True
    message: str
    data: list[CCPViolationItem]
    total: int


# ---------------------------------------------------------------------------
# 공통 단건 응답 래퍼
# ---------------------------------------------------------------------------

class ProcessDetailAPIResponse(BaseModel):
    """공정 실적 단건 API 응답."""

    success: bool = True
    message: str
    data: Optional[dict] = None
