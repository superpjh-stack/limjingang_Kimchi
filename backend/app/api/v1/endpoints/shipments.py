"""출하관리 엔드포인트 모듈.

출하 목록 조회, 등록, 상세 조회, 출하 확정, 배달 확인 API를 제공합니다.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.inventory import crud_inventory
from app.models.user import User
from app.schemas.inventory import (
    APIResponse,
    ShipmentCreate,
    ShipmentResponse,
    ShipmentUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse,
    summary="출하 목록 조회",
)
def get_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="상태 필터 (READY/SHIPPED/DELIVERED/RETURNED)"),
    customer_id: Optional[int] = Query(None, description="거래처 ID 필터"),
    date_from: Optional[datetime] = Query(None, description="출하일 시작"),
    date_to: Optional[datetime] = Query(None, description="출하일 종료"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """출하 목록을 필터 조건으로 조회합니다."""
    items, total = crud_inventory.get_shipment_multi(
        db,
        skip=skip,
        limit=limit,
        status=status,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
    )
    return APIResponse(
        success=True,
        message="출하 목록 조회 성공",
        data=[ShipmentResponse.from_orm_full(s) for s in items],
        total=total,
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="출하 등록",
)
def create_shipment(
    obj_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """출하 헤더와 상세를 등록합니다. 출하번호(SHP-YYYYMMDD-NNN) 자동 생성, total_qty/amount 자동 계산."""
    shipment = crud_inventory.create_shipment(db, obj_in=obj_in, created_by=current_user.username)
    return APIResponse(
        success=True,
        message=f"출하 등록 성공 ({shipment.shipment_no})",
        data=ShipmentResponse.from_orm_full(shipment),
    )


@router.get(
    "/{shipment_id}",
    response_model=APIResponse,
    summary="출하 상세 조회",
)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """출하 상세 정보를 조회합니다."""
    shipment = crud_inventory.get_shipment(db, id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="출하 기록을 찾을 수 없습니다.")
    return APIResponse(
        success=True,
        message="출하 조회 성공",
        data=ShipmentResponse.from_orm_full(shipment),
    )


@router.put(
    "/{shipment_id}",
    response_model=APIResponse,
    summary="출하 수정",
)
def update_shipment(
    shipment_id: int,
    obj_in: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """출하 정보를 수정합니다. READY 상태에서만 수정 가능합니다."""
    shipment = crud_inventory.get_shipment(db, id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="출하 기록을 찾을 수 없습니다.")
    if shipment.status != "READY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"READY 상태의 출하만 수정할 수 있습니다. 현재 상태: {shipment.status}",
        )
    shipment = crud_inventory.update_shipment(
        db, db_obj=shipment, obj_in=obj_in, updated_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message="출하 수정 성공",
        data=ShipmentResponse.from_orm_full(shipment),
    )


@router.post(
    "/{shipment_id}/ship",
    response_model=APIResponse,
    summary="출하 확정 (READY → SHIPPED)",
)
def ship_out(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """출하를 확정합니다. 완제품 재고가 자동 차감됩니다."""
    shipment = crud_inventory.get_shipment(db, id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="출하 기록을 찾을 수 없습니다.")
    if shipment.status != "READY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"READY 상태의 출하만 확정할 수 있습니다. 현재 상태: {shipment.status}",
        )
    shipment = crud_inventory.ship_out(
        db, shipment_id=shipment_id, shipped_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message=f"출하 확정 성공 ({shipment.shipment_no})",
        data=ShipmentResponse.from_orm_full(shipment),
    )


@router.post(
    "/{shipment_id}/deliver",
    response_model=APIResponse,
    summary="배달 확인 (SHIPPED → DELIVERED)",
)
def deliver(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """배달 완료를 확인합니다 (SHIPPED → DELIVERED)."""
    shipment = crud_inventory.get_shipment(db, id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="출하 기록을 찾을 수 없습니다.")
    if shipment.status != "SHIPPED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SHIPPED 상태의 출하만 배달 확인할 수 있습니다. 현재 상태: {shipment.status}",
        )
    shipment = crud_inventory.deliver(
        db, shipment_id=shipment_id, delivered_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message=f"배달 확인 성공 ({shipment.shipment_no})",
        data=ShipmentResponse.from_orm_full(shipment),
    )
