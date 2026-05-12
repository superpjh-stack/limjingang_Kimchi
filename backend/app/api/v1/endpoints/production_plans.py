"""생산계획 엔드포인트 모듈.

생산계획 목록 조회, 등록, 상세 조회, 수정, 확정, 작업지시 자동 생성 API를 제공합니다.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.production import crud_production_plan
from app.models.user import User
from app.schemas.production import (
    APIResponse,
    ProductionPlanCreate,
    ProductionPlanListResponse,
    ProductionPlanResponse,
    ProductionPlanUpdate,
    WorkOrderResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=ProductionPlanListResponse,
    summary="생산계획 목록 조회",
)
def get_production_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="상태 필터 (DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED)"),
    plan_date_from: Optional[datetime] = Query(None, description="계획일 시작"),
    plan_date_to: Optional[datetime] = Query(None, description="계획일 종료"),
    product_id: Optional[int] = Query(None, description="제품 ID 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProductionPlanListResponse:
    """생산계획 목록을 필터 조건으로 조회합니다."""
    plans, total = crud_production_plan.get_multi_with_filter(
        db,
        skip=skip,
        limit=limit,
        status=status,
        plan_date_from=plan_date_from,
        plan_date_to=plan_date_to,
        product_id=product_id,
    )
    return ProductionPlanListResponse(
        success=True,
        message="생산계획 목록 조회 성공",
        data=[ProductionPlanResponse.from_orm_full(p) for p in plans],
        total=total,
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="생산계획 등록",
)
def create_production_plan(
    plan_in: ProductionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """생산계획을 등록합니다. 계획번호(PLAN-YYYYMMDD-NNN)는 자동 생성됩니다."""
    plan = crud_production_plan.create(
        db,
        obj_in=plan_in,
        created_by=current_user.username,
    )
    plan = crud_production_plan.get_with_relations(db, id=plan.id)
    return APIResponse(
        success=True,
        message="생산계획 등록 성공",
        data=ProductionPlanResponse.from_orm_full(plan),
    )


@router.get(
    "/{plan_id}",
    response_model=APIResponse,
    summary="생산계획 상세 조회",
)
def get_production_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """생산계획 상세 정보를 조회합니다."""
    plan = crud_production_plan.get_with_relations(db, id=plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="생산계획을 찾을 수 없습니다.",
        )
    return APIResponse(
        success=True,
        message="생산계획 조회 성공",
        data=ProductionPlanResponse.from_orm_full(plan),
    )


@router.put(
    "/{plan_id}",
    response_model=APIResponse,
    summary="생산계획 수정",
)
def update_production_plan(
    plan_id: int,
    plan_in: ProductionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """생산계획 정보를 수정합니다. DRAFT 상태에서만 수정 가능합니다."""
    plan = crud_production_plan.get(db, id=plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="생산계획을 찾을 수 없습니다.",
        )
    if plan.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DRAFT 상태의 계획만 수정할 수 있습니다. 현재 상태: {plan.status}",
        )
    plan = crud_production_plan.update(
        db,
        db_obj=plan,
        obj_in=plan_in,
        updated_by=current_user.username,
    )
    plan = crud_production_plan.get_with_relations(db, id=plan_id)
    return APIResponse(
        success=True,
        message="생산계획 수정 성공",
        data=ProductionPlanResponse.from_orm_full(plan),
    )


@router.post(
    "/{plan_id}/confirm",
    response_model=APIResponse,
    summary="생산계획 확정",
)
def confirm_production_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """생산계획을 확정합니다 (DRAFT → CONFIRMED)."""
    plan = crud_production_plan.get(db, id=plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="생산계획을 찾을 수 없습니다.",
        )
    if plan.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DRAFT 상태의 계획만 확정할 수 있습니다. 현재 상태: {plan.status}",
        )
    plan = crud_production_plan.confirm_plan(
        db,
        plan_id=plan_id,
        updated_by=current_user.username,
    )
    plan = crud_production_plan.get_with_relations(db, id=plan_id)
    return APIResponse(
        success=True,
        message=f"생산계획 {plan.plan_no}이 확정되었습니다.",
        data=ProductionPlanResponse.from_orm_full(plan),
    )


@router.post(
    "/{plan_id}/work-orders",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="작업지시 자동 생성",
)
def create_work_orders_from_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """확정된 생산계획에서 공정별 작업지시를 자동으로 생성합니다."""
    plan = crud_production_plan.get(db, id=plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="생산계획을 찾을 수 없습니다.",
        )
    if plan.status not in ("CONFIRMED", "IN_PROGRESS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"확정(CONFIRMED) 또는 진행중(IN_PROGRESS) 상태의 계획에만 작업지시를 생성할 수 있습니다. 현재 상태: {plan.status}",
        )
    work_orders = crud_production_plan.create_work_orders_from_plan(
        db,
        plan_id=plan_id,
        created_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message=f"작업지시 {len(work_orders)}건이 생성되었습니다.",
        data=[WorkOrderResponse.from_orm_full(wo) for wo in work_orders],
        total=len(work_orders),
    )
