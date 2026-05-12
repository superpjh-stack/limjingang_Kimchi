"""작업지시 엔드포인트 모듈.

작업지시 목록 조회, 상세 조회, 수정, 작업 시작/완료, 실적 입력/조회, QC 검사 결과 입력 API를 제공합니다.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.production import crud_work_order
from app.models.user import User
from app.schemas.production import (
    APIResponse,
    QCRecordCreate,
    QCRecordResponse,
    WorkOrderListResponse,
    WorkOrderResponse,
    WorkOrderResultCreate,
    WorkOrderResultResponse,
    WorkOrderUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=WorkOrderListResponse,
    summary="작업지시 목록 조회",
)
def get_work_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="상태 필터 (ISSUED/IN_PROGRESS/PAUSED/COMPLETED/CANCELLED)"),
    work_date: Optional[datetime] = Query(None, description="작업일 필터"),
    product_id: Optional[int] = Query(None, description="제품 ID 필터"),
    assigned_user_id: Optional[int] = Query(None, description="담당 작업자 ID 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkOrderListResponse:
    """작업지시 목록을 필터 조건으로 조회합니다."""
    work_orders, total = crud_work_order.get_multi_with_filter(
        db,
        skip=skip,
        limit=limit,
        status=status,
        work_date=work_date,
        product_id=product_id,
        assigned_user_id=assigned_user_id,
    )
    return WorkOrderListResponse(
        success=True,
        message="작업지시 목록 조회 성공",
        data=[WorkOrderResponse.from_orm_full(wo) for wo in work_orders],
        total=total,
    )


@router.get(
    "/{wo_id}",
    response_model=APIResponse,
    summary="작업지시 상세 조회",
)
def get_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업지시 상세 정보를 작업실적 포함하여 조회합니다."""
    wo = crud_work_order.get_with_relations(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    return APIResponse(
        success=True,
        message="작업지시 조회 성공",
        data=WorkOrderResponse.from_orm_full(wo),
    )


@router.put(
    "/{wo_id}",
    response_model=APIResponse,
    summary="작업지시 수정",
)
def update_work_order(
    wo_id: int,
    wo_in: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업지시 정보를 수정합니다. ISSUED 또는 PAUSED 상태에서만 수정 가능합니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    if wo.status not in ("ISSUED", "PAUSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ISSUED 또는 PAUSED 상태의 작업지시만 수정할 수 있습니다. 현재 상태: {wo.status}",
        )
    wo = crud_work_order.update(
        db,
        db_obj=wo,
        obj_in=wo_in,
        updated_by=current_user.username,
    )
    wo = crud_work_order.get_with_relations(db, id=wo_id)
    return APIResponse(
        success=True,
        message="작업지시 수정 성공",
        data=WorkOrderResponse.from_orm_full(wo),
    )


@router.post(
    "/{wo_id}/start",
    response_model=APIResponse,
    summary="작업 시작",
)
def start_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업을 시작합니다 (ISSUED → IN_PROGRESS). start_datetime이 자동 기록됩니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    if wo.status != "ISSUED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ISSUED 상태의 작업지시만 시작할 수 있습니다. 현재 상태: {wo.status}",
        )
    wo = crud_work_order.update_work_order_status(
        db,
        wo_id=wo_id,
        status="IN_PROGRESS",
        updated_by=current_user.username,
    )
    wo = crud_work_order.get_with_relations(db, id=wo_id)
    return APIResponse(
        success=True,
        message=f"작업지시 {wo.work_order_no} 작업이 시작되었습니다.",
        data=WorkOrderResponse.from_orm_full(wo),
    )


@router.post(
    "/{wo_id}/complete",
    response_model=APIResponse,
    summary="작업 완료",
)
def complete_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업을 완료합니다 (IN_PROGRESS → COMPLETED). end_datetime, completed_at이 자동 기록됩니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    if wo.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IN_PROGRESS 상태의 작업지시만 완료할 수 있습니다. 현재 상태: {wo.status}",
        )
    wo = crud_work_order.update_work_order_status(
        db,
        wo_id=wo_id,
        status="COMPLETED",
        updated_by=current_user.username,
    )
    wo = crud_work_order.get_with_relations(db, id=wo_id)
    return APIResponse(
        success=True,
        message=f"작업지시 {wo.work_order_no} 작업이 완료되었습니다.",
        data=WorkOrderResponse.from_orm_full(wo),
    )


@router.post(
    "/{wo_id}/results",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="작업실적 입력",
)
def record_work_order_result(
    wo_id: int,
    result_in: WorkOrderResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업실적을 입력합니다. 작업지시의 actual_qty가 누적 업데이트됩니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    if wo.status not in ("IN_PROGRESS", "COMPLETED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IN_PROGRESS 또는 COMPLETED 상태의 작업지시만 실적 입력이 가능합니다. 현재 상태: {wo.status}",
        )
    result = crud_work_order.record_result(
        db,
        wo_id=wo_id,
        result_in=result_in,
        recorded_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message="작업실적이 입력되었습니다.",
        data=WorkOrderResultResponse.model_validate(result),
    )


@router.get(
    "/{wo_id}/results",
    response_model=APIResponse,
    summary="작업실적 조회",
)
def get_work_order_results(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업지시의 실적 목록을 순번 순으로 조회합니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    results = crud_work_order.get_results(db, wo_id=wo_id)
    return APIResponse(
        success=True,
        message="작업실적 조회 성공",
        data=[WorkOrderResultResponse.model_validate(r) for r in results],
        total=len(results),
    )


@router.post(
    "/{wo_id}/qc",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="QC 검사 결과 입력",
)
def create_qc_record(
    wo_id: int,
    qc_in: QCRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """작업지시에 QC 검사(HACCP CCP 포함) 결과를 입력합니다."""
    wo = crud_work_order.get(db, id=wo_id)
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작업지시를 찾을 수 없습니다.",
        )
    qc = crud_work_order.create_qc_record(
        db,
        wo_id=wo_id,
        qc_in=qc_in,
        inspected_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message="QC 검사 결과가 입력되었습니다.",
        data=QCRecordResponse.from_orm_full(qc),
    )
