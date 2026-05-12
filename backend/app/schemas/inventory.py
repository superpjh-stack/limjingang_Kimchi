"""재고·출하 관련 Pydantic 스키마."""

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 창고 스키마
# ---------------------------------------------------------------------------

class WarehouseCreate(BaseModel):
    """창고 생성 스키마."""

    warehouse_code: str = Field(..., max_length=30, description="창고 코드")
    warehouse_name: str = Field(..., max_length=100, description="창고명")
    warehouse_type: str = Field(..., description="창고 유형 (MATERIAL/PRODUCT/COLD/FREEZE)")
    location: Optional[str] = Field(None, max_length=200, description="위치")
    capacity: Optional[int] = Field(None, ge=0, description="용량")
    temp_control: bool = Field(False, description="온도 관리 여부")
    min_temp: Optional[float] = Field(None, description="최소 온도")
    max_temp: Optional[float] = Field(None, description="최대 온도")
    is_active: bool = Field(True, description="사용 여부")
    notes: Optional[str] = Field(None, description="비고")


class WarehouseUpdate(BaseModel):
    """창고 수정 스키마."""

    warehouse_name: Optional[str] = Field(None, max_length=100)
    warehouse_type: Optional[str] = None
    location: Optional[str] = Field(None, max_length=200)
    capacity: Optional[int] = Field(None, ge=0)
    temp_control: Optional[bool] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class WarehouseResponse(BaseModel):
    """창고 응답 스키마."""

    id: int
    warehouse_code: str
    warehouse_name: str
    warehouse_type: str
    location: Optional[str] = None
    capacity: Optional[int] = None
    temp_control: bool
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# 원자재 입고 스키마
# ---------------------------------------------------------------------------

class MaterialReceiveCreate(BaseModel):
    """원자재 입고 생성 스키마."""

    raw_material_id: int = Field(..., description="원자재 ID")
    warehouse_id: int = Field(..., description="창고 ID")
    receive_date: datetime = Field(..., description="입고일")
    receive_qty: float = Field(..., gt=0, description="입고 수량")
    unit_price: int = Field(0, ge=0, description="단가 (원)")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호")
    supplier: Optional[str] = Field(None, max_length=100, description="공급업체")
    expiry_date: Optional[datetime] = Field(None, description="유통기한")
    notes: Optional[str] = Field(None, description="비고")


class MaterialReceiveUpdate(BaseModel):
    """원자재 입고 수정 스키마."""

    receive_date: Optional[datetime] = None
    receive_qty: Optional[float] = Field(None, gt=0)
    unit_price: Optional[int] = Field(None, ge=0)
    lot_no: Optional[str] = Field(None, max_length=50)
    supplier: Optional[str] = Field(None, max_length=100)
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


class MaterialReceiveQcUpdate(BaseModel):
    """원자재 입고 QC 상태 업데이트 스키마."""

    qc_status: str = Field(..., description="QC 상태 (PENDING/PASS/FAIL/SKIP)")
    qc_notes: Optional[str] = Field(None, description="QC 메모")


class MaterialReceiveResponse(BaseModel):
    """원자재 입고 응답 스키마."""

    id: int
    receive_no: str
    raw_material_id: int
    raw_material_name: Optional[str] = None
    raw_material_code: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    receive_date: datetime
    receive_qty: float
    unit_price: int
    amount: int
    lot_no: Optional[str] = None
    supplier: Optional[str] = None
    expiry_date: Optional[datetime] = None
    qc_status: str
    qc_notes: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_names(cls, obj: Any) -> "MaterialReceiveResponse":
        """ORM 객체에서 연관 이름 포함 응답 생성."""
        data = cls.model_validate(obj)
        if obj.raw_material:
            data.raw_material_name = obj.raw_material.material_name
            data.raw_material_code = obj.raw_material.material_code
        if obj.warehouse:
            data.warehouse_name = obj.warehouse.warehouse_name
        return data


# ---------------------------------------------------------------------------
# 원자재 재고 스키마
# ---------------------------------------------------------------------------

class WarehouseBreakdown(BaseModel):
    """창고별 재고 내역."""

    warehouse_id: int
    warehouse_name: str
    lot_no: Optional[str] = None
    current_qty: float
    unit_price: int
    receive_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    expiry_warning: bool = False

    model_config = ConfigDict(from_attributes=True)


class MaterialStockResponse(BaseModel):
    """원자재 재고 응답 스키마 (lot 단위)."""

    id: int
    raw_material_id: int
    raw_material_name: Optional[str] = None
    raw_material_code: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    lot_no: Optional[str] = None
    current_qty: float
    unit: Optional[str] = None
    unit_price: int
    receive_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    supplier: Optional[str] = None
    expiry_warning: bool = False

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_names(cls, obj: Any) -> "MaterialStockResponse":
        """ORM 객체에서 연관 이름 포함 응답 생성."""
        from datetime import date, timedelta
        data = cls.model_validate(obj)
        if obj.raw_material:
            data.raw_material_name = obj.raw_material.material_name
            data.raw_material_code = obj.raw_material.material_code
        if obj.warehouse:
            data.warehouse_name = obj.warehouse.warehouse_name
        if obj.expiry_date:
            warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)
            expiry_aware = obj.expiry_date.replace(tzinfo=timezone.utc) if obj.expiry_date.tzinfo is None else obj.expiry_date
            data.expiry_warning = expiry_aware <= warning_threshold
        return data


class MaterialStockSummary(BaseModel):
    """원자재 재고 집계 (자재별)."""

    raw_material_id: int
    raw_material_name: str
    raw_material_code: str
    total_qty: float
    unit: Optional[str] = None
    warehouse_breakdown: List[WarehouseBreakdown] = []
    has_expiry_warning: bool = False


# ---------------------------------------------------------------------------
# 원자재 입출고 이력 스키마
# ---------------------------------------------------------------------------

class MaterialTransactionCreate(BaseModel):
    """원자재 입출고 이력 생성 스키마."""

    raw_material_id: int = Field(..., description="원자재 ID")
    warehouse_id: int = Field(..., description="창고 ID")
    trans_type: str = Field(..., description="거래 유형 (IN/OUT/ADJUST/RETURN)")
    trans_date: datetime = Field(..., description="거래일시")
    trans_qty: float = Field(..., description="거래 수량 (음수=출고)")
    unit_price: int = Field(0, ge=0, description="단가 (원)")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호")
    work_order_id: Optional[int] = Field(None, description="작업지시 ID")
    reason: Optional[str] = Field(None, max_length=200, description="사유")
    notes: Optional[str] = Field(None, description="비고")


class MaterialTransactionResponse(BaseModel):
    """원자재 입출고 이력 응답 스키마."""

    id: int
    raw_material_id: int
    raw_material_name: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    trans_type: str
    trans_date: datetime
    trans_qty: float
    before_qty: float
    after_qty: float
    unit_price: int
    lot_no: Optional[str] = None
    work_order_id: Optional[int] = None
    ref_no: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_names(cls, obj: Any) -> "MaterialTransactionResponse":
        """ORM 객체에서 연관 이름 포함 응답 생성."""
        data = cls.model_validate(obj)
        if obj.raw_material:
            data.raw_material_name = obj.raw_material.material_name
        if obj.warehouse:
            data.warehouse_name = obj.warehouse.warehouse_name
        return data


# ---------------------------------------------------------------------------
# 원자재 출고 요청 스키마
# ---------------------------------------------------------------------------

class MaterialIssueRequest(BaseModel):
    """원자재 출고 요청 스키마."""

    raw_material_id: int = Field(..., description="원자재 ID")
    warehouse_id: int = Field(..., description="출고 창고 ID")
    qty: float = Field(..., gt=0, description="출고 수량")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호 (없으면 선입선출)")
    work_order_id: Optional[int] = Field(None, description="작업지시 ID")
    reason: Optional[str] = Field(None, max_length=200, description="출고 사유")
    notes: Optional[str] = Field(None, description="비고")


# ---------------------------------------------------------------------------
# 완제품 재고 스키마
# ---------------------------------------------------------------------------

class ProductStockResponse(BaseModel):
    """완제품 재고 응답 스키마 (lot 단위)."""

    id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    lot_no: Optional[str] = None
    current_qty: float
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    work_order_id: Optional[int] = None
    unit_price: int
    expiry_warning: bool = False

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_names(cls, obj: Any) -> "ProductStockResponse":
        """ORM 객체에서 연관 이름 포함 응답 생성."""
        data = cls.model_validate(obj)
        if obj.product:
            data.product_name = obj.product.product_name
            data.product_code = obj.product.product_code
        if obj.warehouse:
            data.warehouse_name = obj.warehouse.warehouse_name
        if obj.expiry_date:
            warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)
            expiry_aware = obj.expiry_date.replace(tzinfo=timezone.utc) if obj.expiry_date.tzinfo is None else obj.expiry_date
            data.expiry_warning = expiry_aware <= warning_threshold
        return data


class ProductWarehouseBreakdown(BaseModel):
    """창고별 완제품 재고 내역."""

    warehouse_id: int
    warehouse_name: str
    lot_no: Optional[str] = None
    current_qty: float
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    expiry_warning: bool = False

    model_config = ConfigDict(from_attributes=True)


class ProductStockSummary(BaseModel):
    """완제품 재고 집계 (제품별)."""

    product_id: int
    product_name: str
    product_code: str
    total_qty: float
    warehouse_breakdown: List[ProductWarehouseBreakdown] = []
    has_expiry_warning: bool = False


# ---------------------------------------------------------------------------
# 출하 스키마
# ---------------------------------------------------------------------------

class ShipmentDetailCreate(BaseModel):
    """출하 상세 생성 스키마."""

    product_id: int = Field(..., description="제품 ID")
    order_detail_id: Optional[int] = Field(None, description="수주상세 ID")
    lot_no: Optional[str] = Field(None, max_length=50, description="LOT 번호")
    ship_qty: float = Field(..., gt=0, description="출하 수량")
    unit_price: int = Field(0, ge=0, description="단가 (원)")
    expiry_date: Optional[datetime] = Field(None, description="유통기한")
    notes: Optional[str] = Field(None, description="비고")


class ShipmentCreate(BaseModel):
    """출하 생성 스키마."""

    order_id: Optional[int] = Field(None, description="수주 ID")
    customer_id: int = Field(..., description="거래처 ID")
    shipment_date: datetime = Field(..., description="출하 예정일")
    delivery_address: Optional[str] = Field(None, max_length=500, description="배송지 주소")
    driver_name: Optional[str] = Field(None, max_length=50, description="운전기사")
    vehicle_no: Optional[str] = Field(None, max_length=20, description="차량번호")
    notes: Optional[str] = Field(None, description="비고")
    details: List[ShipmentDetailCreate] = Field(..., min_length=1, description="출하 상세 목록")


class ShipmentUpdate(BaseModel):
    """출하 수정 스키마."""

    shipment_date: Optional[datetime] = None
    delivery_address: Optional[str] = Field(None, max_length=500)
    driver_name: Optional[str] = Field(None, max_length=50)
    vehicle_no: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class ShipmentStatusUpdate(BaseModel):
    """출하 상태 변경 스키마."""

    status: str = Field(..., description="변경할 상태")


class ShipmentDetailResponse(BaseModel):
    """출하 상세 응답 스키마."""

    id: int
    shipment_id: int
    product_id: int
    product_name: Optional[str] = None
    order_detail_id: Optional[int] = None
    lot_no: Optional[str] = None
    ship_qty: float
    unit_price: int
    amount: int
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_name(cls, obj: Any) -> "ShipmentDetailResponse":
        """ORM 객체에서 product_name 포함 응답 생성."""
        data = cls.model_validate(obj)
        if obj.product:
            data.product_name = obj.product.product_name
        return data


class ShipmentResponse(BaseModel):
    """출하 응답 스키마."""

    id: int
    shipment_no: str
    order_id: Optional[int] = None
    order_no: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    shipment_date: datetime
    status: str
    delivery_address: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_no: Optional[str] = None
    total_qty: float
    total_amount: int
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    details: List[ShipmentDetailResponse] = []
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_full(cls, obj: Any) -> "ShipmentResponse":
        """ORM 객체에서 customer_name, order_no, details 포함 응답 생성."""
        data = cls.model_validate(obj)
        if obj.customer:
            data.customer_name = obj.customer.customer_name
        if obj.order:
            data.order_no = obj.order.order_no
        data.details = [ShipmentDetailResponse.from_orm_with_name(d) for d in obj.details]
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
