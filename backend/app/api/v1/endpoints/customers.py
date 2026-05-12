"""고객 관리 엔드포인트 모듈.

고객(거래처) 목록 조회, 상세 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.customer import crud_customer
from app.models.user import User
from app.schemas.customer import (
    APIResponse,
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=CustomerListResponse,
    summary="고객 목록 조회",
)
def get_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="검색어 (코드, 이름, 담당자)"),
    customer_type: Optional[str] = Query(None, description="고객 유형 필터"),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CustomerListResponse:
    """고객 목록 조회."""
    customers, total = crud_customer.get_multi_with_search(
        db,
        skip=skip,
        limit=limit,
        search=search,
        customer_type=customer_type,
        is_active=is_active,
    )

    return CustomerListResponse(
        success=True,
        message="고객 목록 조회 성공",
        data=[CustomerResponse.model_validate(c) for c in customers],
        total=total,
    )


@router.get(
    "/{customer_id}",
    response_model=APIResponse,
    summary="고객 상세 조회",
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고객 상세 조회."""
    customer = crud_customer.get(db, id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {customer_id}인 고객을 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="고객 조회 성공",
        data=CustomerResponse.model_validate(customer),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="고객 등록",
)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고객 등록."""
    existing = crud_customer.get_by_code(db, customer_code=customer_in.customer_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"고객 코드 '{customer_in.customer_code}'이 이미 존재합니다.",
        )

    customer = crud_customer.create(
        db,
        obj_in=customer_in,
        created_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="고객 등록 성공",
        data=CustomerResponse.model_validate(customer),
    )


@router.put(
    "/{customer_id}",
    response_model=APIResponse,
    summary="고객 수정",
)
def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고객 수정."""
    customer = crud_customer.get(db, id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {customer_id}인 고객을 찾을 수 없습니다.",
        )

    customer = crud_customer.update(
        db,
        db_obj=customer,
        obj_in=customer_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="고객 수정 성공",
        data=CustomerResponse.model_validate(customer),
    )


@router.delete(
    "/{customer_id}",
    response_model=APIResponse,
    summary="고객 삭제",
)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고객 소프트 삭제."""
    customer = crud_customer.get(db, id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {customer_id}인 고객을 찾을 수 없습니다.",
        )

    crud_customer.remove(db, id=customer_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"고객 '{customer.customer_name}'이 삭제되었습니다.",
    )
