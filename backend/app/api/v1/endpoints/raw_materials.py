"""원재료 관리 엔드포인트 모듈.

원재료 목록 조회, 상세 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.models.raw_material import RawMaterial
from app.models.user import User
from app.schemas.raw_material import (
    APIResponse,
    RawMaterialCreate,
    RawMaterialListResponse,
    RawMaterialResponse,
    RawMaterialUpdate,
)

router = APIRouter()

crud_raw_material = CRUDBase[RawMaterial, RawMaterialCreate, RawMaterialUpdate](RawMaterial)


@router.get(
    "",
    response_model=RawMaterialListResponse,
    summary="원재료 목록 조회",
    description="원재료 목록을 페이지네이션으로 조회합니다.",
)
def get_raw_materials(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(20, ge=1, le=100, description="최대 반환 레코드 수"),
    search: Optional[str] = Query(None, description="검색어 (코드 또는 이름)"),
    material_type: Optional[str] = Query(None, description="원재료 유형 필터"),
    is_active: Optional[bool] = Query(None, description="활성 여부 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RawMaterialListResponse:
    """원재료 목록 조회."""
    query = db.query(RawMaterial).filter(RawMaterial.is_deleted == False)

    if search:
        query = query.filter(
            or_(
                RawMaterial.material_code.ilike(f"%{search}%"),
                RawMaterial.material_name.ilike(f"%{search}%"),
            )
        )

    if material_type:
        query = query.filter(RawMaterial.material_type == material_type)

    if is_active is not None:
        query = query.filter(RawMaterial.is_active == is_active)

    total = query.count()
    materials = query.order_by(RawMaterial.material_code).offset(skip).limit(limit).all()

    return RawMaterialListResponse(
        success=True,
        message="원재료 목록 조회 성공",
        data=[RawMaterialResponse.model_validate(m) for m in materials],
        total=total,
    )


@router.get(
    "/{material_id}",
    response_model=APIResponse,
    summary="원재료 상세 조회",
)
def get_raw_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원재료 상세 조회."""
    material = crud_raw_material.get(db, id=material_id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {material_id}인 원재료를 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="원재료 조회 성공",
        data=RawMaterialResponse.model_validate(material),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="원재료 등록",
)
def create_raw_material(
    material_in: RawMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원재료 등록."""
    # 코드 중복 체크
    existing = (
        db.query(RawMaterial)
        .filter(
            RawMaterial.material_code == material_in.material_code,
            RawMaterial.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"원재료 코드 '{material_in.material_code}'이 이미 존재합니다.",
        )

    material = crud_raw_material.create(
        db,
        obj_in=material_in,
        created_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="원재료 등록 성공",
        data=RawMaterialResponse.model_validate(material),
    )


@router.put(
    "/{material_id}",
    response_model=APIResponse,
    summary="원재료 수정",
)
def update_raw_material(
    material_id: int,
    material_in: RawMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원재료 수정."""
    material = crud_raw_material.get(db, id=material_id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {material_id}인 원재료를 찾을 수 없습니다.",
        )

    material = crud_raw_material.update(
        db,
        db_obj=material,
        obj_in=material_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="원재료 수정 성공",
        data=RawMaterialResponse.model_validate(material),
    )


@router.delete(
    "/{material_id}",
    response_model=APIResponse,
    summary="원재료 삭제",
)
def delete_raw_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원재료 소프트 삭제."""
    material = crud_raw_material.get(db, id=material_id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {material_id}인 원재료를 찾을 수 없습니다.",
        )

    crud_raw_material.remove(db, id=material_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"원재료 '{material.material_name}'이 삭제되었습니다.",
    )
