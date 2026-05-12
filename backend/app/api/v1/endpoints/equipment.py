"""설비 관리 엔드포인트 모듈.

설비 목록 조회, 상세 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas.equipment import (
    APIResponse,
    EquipmentCreate,
    EquipmentListResponse,
    EquipmentResponse,
    EquipmentUpdate,
)

router = APIRouter()

crud_equipment = CRUDBase[Equipment, EquipmentCreate, EquipmentUpdate](Equipment)


@router.get(
    "",
    response_model=EquipmentListResponse,
    summary="설비 목록 조회",
)
def get_equipment_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="검색어 (코드 또는 이름)"),
    equipment_type: Optional[str] = Query(None, description="설비 유형 필터"),
    status_filter: Optional[str] = Query(None, alias="status", description="상태 필터"),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EquipmentListResponse:
    """설비 목록 조회."""
    query = db.query(Equipment).filter(Equipment.is_deleted == False)

    if search:
        query = query.filter(
            or_(
                Equipment.equipment_code.ilike(f"%{search}%"),
                Equipment.equipment_name.ilike(f"%{search}%"),
            )
        )

    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)

    if status_filter:
        query = query.filter(Equipment.status == status_filter)

    if is_active is not None:
        query = query.filter(Equipment.is_active == is_active)

    total = query.count()
    equipments = query.order_by(Equipment.equipment_code).offset(skip).limit(limit).all()

    return EquipmentListResponse(
        success=True,
        message="설비 목록 조회 성공",
        data=[EquipmentResponse.model_validate(e) for e in equipments],
        total=total,
    )


@router.get(
    "/{equipment_id}",
    response_model=APIResponse,
    summary="설비 상세 조회",
)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 상세 조회."""
    equip = crud_equipment.get(db, id=equipment_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="설비 조회 성공",
        data=EquipmentResponse.model_validate(equip),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="설비 등록",
)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 등록."""
    existing = (
        db.query(Equipment)
        .filter(
            Equipment.equipment_code == equipment_in.equipment_code,
            Equipment.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"설비 코드 '{equipment_in.equipment_code}'이 이미 존재합니다.",
        )

    equip = crud_equipment.create(
        db,
        obj_in=equipment_in,
        created_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="설비 등록 성공",
        data=EquipmentResponse.model_validate(equip),
    )


@router.put(
    "/{equipment_id}",
    response_model=APIResponse,
    summary="설비 수정",
)
def update_equipment(
    equipment_id: int,
    equipment_in: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 수정."""
    equip = crud_equipment.get(db, id=equipment_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    equip = crud_equipment.update(
        db,
        db_obj=equip,
        obj_in=equipment_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="설비 수정 성공",
        data=EquipmentResponse.model_validate(equip),
    )


@router.delete(
    "/{equipment_id}",
    response_model=APIResponse,
    summary="설비 삭제",
)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 소프트 삭제."""
    equip = crud_equipment.get(db, id=equipment_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    crud_equipment.remove(db, id=equipment_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"설비 '{equip.equipment_name}'이 삭제되었습니다.",
    )
