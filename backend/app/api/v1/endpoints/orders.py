"""수주 관리 엔드포인트 모듈.

수주 목록 조회, 등록, 상세 조회, 수정, 확정, 취소, 변경이력 조회 API를 제공합니다.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.order import crud_order
from app.models.user import User
from app.schemas.order import (
    APIResponse,
    OrderCreate,
    OrderHistoryResponse,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdate,
    OrderUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=OrderListResponse,
    summary="수주 목록 조회",
)
def get_orders(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(20, ge=1, le=100, description="최대 반환 수"),
    status: Optional[str] = Query(None, description="상태 필터 (DRAFT/CONFIRMED/IN_PRODUCTION/SHIPPED/COMPLETED/CANCELLED)"),
    customer_id: Optional[int] = Query(None, description="고객 ID 필터"),
    order_date_from: Optional[datetime] = Query(None, description="수주일 시작"),
    order_date_to: Optional[datetime] = Query(None, description="수주일 종료"),
    search: Optional[str] = Query(None, description="수주번호 또는 고객명 검색"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OrderListResponse:
    """수주 목록을 필터 조건으로 조회합니다."""
    orders, total = crud_order.get_multi_with_filter(
        db,
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        status=status,
        order_date_from=order_date_from,
        order_date_to=order_date_to,
        search=search,
    )
    return OrderListResponse(
        success=True,
        message="수주 목록 조회 성공",
        data=[OrderResponse.from_orm_full(o) for o in orders],
        total=total,
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="수주 등록",
)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주 헤더와 상세를 동시에 등록합니다. 수주번호(ORD-YYYYMMDD-NNN)는 자동 생성됩니다."""
    order = crud_order.create_with_details(
        db,
        obj_in=order_in,
        created_by=current_user.username,
    )
    # 관계 데이터 포함 재조회
    order = crud_order.get_with_details(db, id=order.id)
    return APIResponse(
        success=True,
        message="수주 등록 성공",
        data=OrderResponse.from_orm_full(order),
    )


@router.get(
    "/{order_id}",
    response_model=APIResponse,
    summary="수주 상세 조회",
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주 상세 정보를 상세 목록 포함하여 조회합니다."""
    order = crud_order.get_with_details(db, id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수주를 찾을 수 없습니다.",
        )
    return APIResponse(
        success=True,
        message="수주 조회 성공",
        data=OrderResponse.from_orm_full(order),
    )


@router.put(
    "/{order_id}",
    response_model=APIResponse,
    summary="수주 수정",
)
def update_order(
    order_id: int,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주 정보를 수정합니다. DRAFT 상태의 수주만 수정 가능합니다."""
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수주를 찾을 수 없습니다.",
        )
    if order.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DRAFT 상태의 수주만 수정할 수 있습니다. 현재 상태: {order.status}",
        )
    order = crud_order.update(
        db,
        db_obj=order,
        obj_in=order_in,
        updated_by=current_user.username,
    )
    order = crud_order.get_with_details(db, id=order_id)
    return APIResponse(
        success=True,
        message="수주 수정 성공",
        data=OrderResponse.from_orm_full(order),
    )


@router.post(
    "/{order_id}/confirm",
    response_model=APIResponse,
    summary="수주 확정",
)
def confirm_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주를 확정합니다 (DRAFT → CONFIRMED)."""
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수주를 찾을 수 없습니다.",
        )
    if order.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DRAFT 상태의 수주만 확정할 수 있습니다. 현재 상태: {order.status}",
        )
    order = crud_order.confirm_order(
        db,
        order_id=order_id,
        confirmed_by=current_user.username,
    )
    order = crud_order.get_with_details(db, id=order_id)
    return APIResponse(
        success=True,
        message=f"수주 {order.order_no}이 확정되었습니다.",
        data=OrderResponse.from_orm_full(order),
    )


@router.post(
    "/{order_id}/cancel",
    response_model=APIResponse,
    summary="수주 취소",
)
def cancel_order(
    order_id: int,
    body: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주를 취소합니다. 취소 사유(reason)가 필수입니다."""
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수주를 찾을 수 없습니다.",
        )
    if order.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"완료 또는 이미 취소된 수주는 취소할 수 없습니다. 현재 상태: {order.status}",
        )
    if not body.reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="취소 사유(reason)를 입력해주세요.",
        )
    crud_order.update_status(
        db,
        order_id=order_id,
        new_status="CANCELLED",
        reason=body.reason,
        updated_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message=f"수주 {order.order_no}이 취소되었습니다.",
    )


@router.get(
    "/{order_id}/history",
    response_model=APIResponse,
    summary="수주 변경이력 조회",
)
def get_order_history(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """수주 변경 이력을 시간 순으로 조회합니다."""
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수주를 찾을 수 없습니다.",
        )
    history = crud_order.get_history(db, order_id=order_id)
    return APIResponse(
        success=True,
        message="수주 변경이력 조회 성공",
        data=[OrderHistoryResponse.model_validate(h) for h in history],
        total=len(history),
    )
