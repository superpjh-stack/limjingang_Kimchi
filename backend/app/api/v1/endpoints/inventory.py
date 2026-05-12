"""재고관리 엔드포인트 모듈.

원자재 입고, 재고 현황, 출고, 완제품 재고, 창고 관리 API를 제공합니다.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.inventory import crud_inventory, crud_warehouse
from app.models.user import User
from app.schemas.inventory import (
    APIResponse,
    MaterialIssueRequest,
    MaterialReceiveCreate,
    MaterialReceiveQcUpdate,
    MaterialReceiveResponse,
    MaterialStockResponse,
    MaterialStockSummary,
    MaterialTransactionResponse,
    ProductStockResponse,
    ProductStockSummary,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 창고 관리
# ---------------------------------------------------------------------------

@router.get(
    "/warehouses",
    response_model=APIResponse,
    summary="창고 목록 조회",
)
def get_warehouses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    warehouse_type: Optional[str] = Query(None, description="창고 유형 필터 (MATERIAL/PRODUCT/COLD/FREEZE)"),
    is_active: Optional[bool] = Query(None, description="사용 여부 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """창고 목록을 조회합니다."""
    items, total = crud_warehouse.get_multi(
        db, skip=skip, limit=limit,
        warehouse_type=warehouse_type, is_active=is_active,
    )
    return APIResponse(
        success=True,
        message="창고 목록 조회 성공",
        data=[WarehouseResponse.model_validate(w) for w in items],
        total=total,
    )


@router.post(
    "/warehouses",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="창고 등록",
)
def create_warehouse(
    obj_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """새 창고를 등록합니다."""
    warehouse = crud_warehouse.create(db, obj_in=obj_in, created_by=current_user.username)
    return APIResponse(
        success=True,
        message="창고 등록 성공",
        data=WarehouseResponse.model_validate(warehouse),
    )


@router.put(
    "/warehouses/{warehouse_id}",
    response_model=APIResponse,
    summary="창고 수정",
)
def update_warehouse(
    warehouse_id: int,
    obj_in: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """창고 정보를 수정합니다."""
    warehouse = crud_warehouse.get(db, id=warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="창고를 찾을 수 없습니다.")
    warehouse = crud_warehouse.update(db, db_obj=warehouse, obj_in=obj_in, updated_by=current_user.username)
    return APIResponse(
        success=True,
        message="창고 수정 성공",
        data=WarehouseResponse.model_validate(warehouse),
    )


# ---------------------------------------------------------------------------
# 원자재 입고
# ---------------------------------------------------------------------------

@router.post(
    "/material-receive",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="원자재 입고 처리",
)
def receive_material(
    obj_in: MaterialReceiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재를 입고 처리합니다. 입고번호(RCV-YYYYMMDD-NNN) 자동 생성, 재고 upsert, 이력 기록."""
    receive = crud_inventory.receive_material(db, obj_in=obj_in, created_by=current_user.username)
    return APIResponse(
        success=True,
        message=f"원자재 입고 처리 성공 ({receive.receive_no})",
        data=MaterialReceiveResponse.from_orm_with_names(receive),
    )


@router.get(
    "/material-receive",
    response_model=APIResponse,
    summary="원자재 입고 목록 조회",
)
def get_material_receives(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    raw_material_id: Optional[int] = Query(None, description="원자재 ID 필터"),
    warehouse_id: Optional[int] = Query(None, description="창고 ID 필터"),
    date_from: Optional[datetime] = Query(None, description="입고일 시작"),
    date_to: Optional[datetime] = Query(None, description="입고일 종료"),
    qc_status: Optional[str] = Query(None, description="QC 상태 필터 (PENDING/PASS/FAIL/SKIP)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 입고 목록을 조회합니다."""
    items, total = crud_inventory.get_receive_multi(
        db,
        skip=skip,
        limit=limit,
        raw_material_id=raw_material_id,
        warehouse_id=warehouse_id,
        date_from=date_from,
        date_to=date_to,
        qc_status=qc_status,
    )
    return APIResponse(
        success=True,
        message="원자재 입고 목록 조회 성공",
        data=[MaterialReceiveResponse.from_orm_with_names(r) for r in items],
        total=total,
    )


@router.get(
    "/material-receive/{receive_id}",
    response_model=APIResponse,
    summary="원자재 입고 상세 조회",
)
def get_material_receive(
    receive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 입고 상세 정보를 조회합니다."""
    receive = crud_inventory.get_receive(db, receive_id)
    if not receive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="입고 기록을 찾을 수 없습니다.")
    return APIResponse(
        success=True,
        message="원자재 입고 조회 성공",
        data=MaterialReceiveResponse.from_orm_with_names(receive),
    )


@router.put(
    "/material-receive/{receive_id}/qc",
    response_model=APIResponse,
    summary="원자재 입고 QC 상태 업데이트",
)
def update_qc_status(
    receive_id: int,
    obj_in: MaterialReceiveQcUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 입고의 QC 상태를 업데이트합니다 (PENDING/PASS/FAIL/SKIP)."""
    receive = crud_inventory.update_qc_status(
        db,
        receive_id=receive_id,
        qc_status=obj_in.qc_status,
        qc_notes=obj_in.qc_notes,
        updated_by=current_user.username,
    )
    if not receive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="입고 기록을 찾을 수 없습니다.")
    return APIResponse(
        success=True,
        message="QC 상태 업데이트 성공",
        data=MaterialReceiveResponse.from_orm_with_names(receive),
    )


# ---------------------------------------------------------------------------
# 원자재 재고
# ---------------------------------------------------------------------------

@router.get(
    "/material-stock",
    response_model=APIResponse,
    summary="원자재 재고 현황 (자재별 집계)",
)
def get_material_stock_summary(
    raw_material_id: Optional[int] = Query(None, description="원자재 ID 필터"),
    warehouse_id: Optional[int] = Query(None, description="창고 ID 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 재고를 자재별로 집계하여 조회합니다. 유통기한 30일 이내 경고 포함."""
    summary_list = crud_inventory.get_material_stock_summary(
        db, raw_material_id=raw_material_id, warehouse_id=warehouse_id,
    )
    return APIResponse(
        success=True,
        message="원자재 재고 현황 조회 성공",
        data=[MaterialStockSummary(**s) for s in summary_list],
        total=len(summary_list),
    )


@router.get(
    "/material-stock/detail",
    response_model=APIResponse,
    summary="원자재 재고 상세 목록 (LOT별)",
)
def get_material_stock_detail(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    raw_material_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 재고를 LOT 단위 상세로 조회합니다."""
    items, total = crud_inventory.get_material_stock_detail(
        db, skip=skip, limit=limit,
        raw_material_id=raw_material_id, warehouse_id=warehouse_id,
    )
    return APIResponse(
        success=True,
        message="원자재 재고 상세 조회 성공",
        data=[MaterialStockResponse.from_orm_with_names(s) for s in items],
        total=total,
    )


@router.post(
    "/material-issue",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="원자재 출고 처리",
)
def issue_material(
    obj_in: MaterialIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재를 출고 처리합니다. 재고 부족 시 400 반환."""
    txn = crud_inventory.issue_material(db, obj_in=obj_in, issued_by=current_user.username)
    return APIResponse(
        success=True,
        message="원자재 출고 처리 성공",
        data=MaterialTransactionResponse.from_orm_with_names(txn),
    )


@router.get(
    "/material-transactions",
    response_model=APIResponse,
    summary="원자재 입출고 이력 조회",
)
def get_material_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    raw_material_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    trans_type: Optional[str] = Query(None, description="거래 유형 (IN/OUT/ADJUST/RETURN)"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원자재 입출고 이력을 조회합니다."""
    items, total = crud_inventory.get_transactions(
        db,
        skip=skip,
        limit=limit,
        raw_material_id=raw_material_id,
        warehouse_id=warehouse_id,
        trans_type=trans_type,
        date_from=date_from,
        date_to=date_to,
    )
    return APIResponse(
        success=True,
        message="입출고 이력 조회 성공",
        data=[MaterialTransactionResponse.from_orm_with_names(t) for t in items],
        total=total,
    )


# ---------------------------------------------------------------------------
# 완제품 재고
# ---------------------------------------------------------------------------

@router.get(
    "/product-stock",
    response_model=APIResponse,
    summary="완제품 재고 현황 (제품별 집계)",
)
def get_product_stock_summary(
    product_id: Optional[int] = Query(None, description="제품 ID 필터"),
    warehouse_id: Optional[int] = Query(None, description="창고 ID 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """완제품 재고를 제품별로 집계하여 조회합니다. 유통기한 30일 이내 경고 포함."""
    summary_list = crud_inventory.get_product_stock_summary(
        db, product_id=product_id, warehouse_id=warehouse_id,
    )
    return APIResponse(
        success=True,
        message="완제품 재고 현황 조회 성공",
        data=[ProductStockSummary(**s) for s in summary_list],
        total=len(summary_list),
    )
