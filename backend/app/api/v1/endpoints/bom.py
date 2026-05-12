"""BOM 관리 엔드포인트 모듈.

BOM(레시피) 목록 조회, 상세 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.bom import crud_bom
from app.models.user import User
from app.schemas.bom import (
    APIResponse,
    BOMCreate,
    BOMListResponse,
    BOMResponse,
    BOMUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=BOMListResponse,
    summary="BOM 목록 조회",
    description="BOM(레시피) 목록을 페이지네이션으로 조회합니다.",
)
def get_boms(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(20, ge=1, le=100, description="최대 반환 레코드 수"),
    product_id: Optional[int] = Query(None, description="제품 ID 필터"),
    is_active: Optional[bool] = Query(None, description="활성 여부 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BOMListResponse:
    """BOM 목록 조회.

    Args:
        skip: 오프셋
        limit: 최대 반환 수
        product_id: 제품 ID 필터
        is_active: 활성 여부 필터
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        BOM 목록 및 전체 개수
    """
    boms, total = crud_bom.get_multi_with_filter(
        db,
        skip=skip,
        limit=limit,
        product_id=product_id,
        is_active=is_active,
    )

    return BOMListResponse(
        success=True,
        message="BOM 목록 조회 성공",
        data=[BOMResponse.model_validate(b) for b in boms],
        total=total,
    )


@router.get(
    "/{bom_id}",
    response_model=APIResponse,
    summary="BOM 상세 조회",
    description="ID로 BOM 상세 정보(원재료 구성 포함)를 조회합니다.",
)
def get_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """BOM 상세 조회 (details 포함).

    Args:
        bom_id: 조회할 BOM ID
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        BOM 상세 정보 (원재료 구성 포함)

    Raises:
        HTTPException: BOM을 찾을 수 없는 경우 404 반환
    """
    bom = crud_bom.get_with_details(db, id=bom_id)
    if not bom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {bom_id}인 BOM을 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="BOM 조회 성공",
        data=BOMResponse.model_validate(bom),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="BOM 등록",
    description="새 BOM(레시피)을 등록합니다. 원재료 구성(details)을 포함할 수 있습니다.",
)
def create_bom(
    bom_in: BOMCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """BOM 등록.

    Args:
        bom_in: BOM 생성 데이터 (details 포함 가능)
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        등록된 BOM 정보
    """
    bom = crud_bom.create_with_details(
        db,
        obj_in=bom_in,
        created_by=current_user.username,
    )

    # details 포함하여 조회
    bom = crud_bom.get_with_details(db, id=bom.id)

    return APIResponse(
        success=True,
        message="BOM 등록 성공",
        data=BOMResponse.model_validate(bom),
    )


@router.put(
    "/{bom_id}",
    response_model=APIResponse,
    summary="BOM 수정",
    description="BOM 헤더 정보를 수정합니다. 원재료 구성은 별도 엔드포인트로 관리합니다.",
)
def update_bom(
    bom_id: int,
    bom_in: BOMUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """BOM 수정.

    Args:
        bom_id: 수정할 BOM ID
        bom_in: 수정 데이터
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        수정된 BOM 정보

    Raises:
        HTTPException: BOM을 찾을 수 없는 경우 404 반환
    """
    bom = crud_bom.get(db, id=bom_id)
    if not bom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {bom_id}인 BOM을 찾을 수 없습니다.",
        )

    bom = crud_bom.update(
        db,
        db_obj=bom,
        obj_in=bom_in,
        updated_by=current_user.username,
    )

    bom = crud_bom.get_with_details(db, id=bom.id)

    return APIResponse(
        success=True,
        message="BOM 수정 성공",
        data=BOMResponse.model_validate(bom),
    )


@router.delete(
    "/{bom_id}",
    response_model=APIResponse,
    summary="BOM 삭제",
    description="BOM을 소프트 삭제합니다.",
)
def delete_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """BOM 삭제 (소프트 삭제).

    Args:
        bom_id: 삭제할 BOM ID
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        삭제 결과 메시지

    Raises:
        HTTPException: BOM을 찾을 수 없는 경우 404 반환
    """
    bom = crud_bom.get(db, id=bom_id)
    if not bom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {bom_id}인 BOM을 찾을 수 없습니다.",
        )

    crud_bom.remove(db, id=bom_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"BOM '{bom.bom_name}'이 삭제되었습니다.",
    )
