"""제품 관리 엔드포인트 모듈.

제품 목록 조회, 상세 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.product import crud_product
from app.models.user import User
from app.schemas.product import (
    APIResponse,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=ProductListResponse,
    summary="제품 목록 조회",
    description="제품 목록을 페이지네이션으로 조회합니다. 검색어와 필터를 지원합니다.",
)
def get_products(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(20, ge=1, le=100, description="최대 반환 레코드 수"),
    search: Optional[str] = Query(None, description="검색어 (제품 코드 또는 이름)"),
    product_type: Optional[str] = Query(None, description="김치 종류 필터"),
    channel_type: Optional[str] = Query(None, description="판매 채널 필터"),
    is_active: Optional[bool] = Query(None, description="활성 여부 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProductListResponse:
    """제품 목록 조회.

    Args:
        skip: 오프셋 (페이지네이션)
        limit: 최대 반환 수 (페이지네이션)
        search: 검색어
        product_type: 김치 종류 필터
        channel_type: 판매 채널 필터
        is_active: 활성 여부 필터
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        제품 목록 및 전체 개수
    """
    products, total = crud_product.get_multi_with_search(
        db,
        skip=skip,
        limit=limit,
        search=search,
        product_type=product_type,
        channel_type=channel_type,
        is_active=is_active,
    )

    return ProductListResponse(
        success=True,
        message="제품 목록 조회 성공",
        data=[ProductResponse.model_validate(p) for p in products],
        total=total,
    )


@router.get(
    "/{product_id}",
    response_model=APIResponse,
    summary="제품 상세 조회",
    description="ID로 제품 상세 정보를 조회합니다.",
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """제품 상세 조회.

    Args:
        product_id: 조회할 제품 ID
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        제품 상세 정보

    Raises:
        HTTPException: 제품을 찾을 수 없는 경우 404 반환
    """
    product = crud_product.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {product_id}인 제품을 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="제품 조회 성공",
        data=ProductResponse.model_validate(product),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="제품 등록",
    description="새 제품을 등록합니다.",
)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """제품 등록.

    Args:
        product_in: 제품 생성 데이터
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        등록된 제품 정보

    Raises:
        HTTPException: 제품 코드가 이미 존재하는 경우 409 반환
    """
    existing = crud_product.get_by_code(db, product_code=product_in.product_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"제품 코드 '{product_in.product_code}'이 이미 존재합니다.",
        )

    product = crud_product.create(db, obj_in=product_in, created_by=current_user.username)

    return APIResponse(
        success=True,
        message="제품 등록 성공",
        data=ProductResponse.model_validate(product),
    )


@router.put(
    "/{product_id}",
    response_model=APIResponse,
    summary="제품 수정",
    description="제품 정보를 수정합니다.",
)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """제품 수정.

    Args:
        product_id: 수정할 제품 ID
        product_in: 수정 데이터
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        수정된 제품 정보

    Raises:
        HTTPException: 제품을 찾을 수 없는 경우 404 반환
    """
    product = crud_product.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {product_id}인 제품을 찾을 수 없습니다.",
        )

    product = crud_product.update(
        db,
        db_obj=product,
        obj_in=product_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="제품 수정 성공",
        data=ProductResponse.model_validate(product),
    )


@router.delete(
    "/{product_id}",
    response_model=APIResponse,
    summary="제품 삭제",
    description="제품을 소프트 삭제합니다 (is_deleted=True, 데이터는 보존).",
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """제품 삭제 (소프트 삭제).

    Args:
        product_id: 삭제할 제품 ID
        db: 데이터베이스 세션
        current_user: 현재 인증된 사용자

    Returns:
        삭제 결과 메시지

    Raises:
        HTTPException: 제품을 찾을 수 없는 경우 404 반환
    """
    product = crud_product.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {product_id}인 제품을 찾을 수 없습니다.",
        )

    crud_product.remove(db, id=product_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"제품 '{product.product_name}'이 삭제되었습니다.",
    )
