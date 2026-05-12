"""공통 코드 관리 엔드포인트 모듈.

공통 코드 목록 조회, 그룹별 조회, 등록, 수정, 삭제 API를 제공합니다.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.models.common_code import CommonCode
from app.models.user import User
from app.schemas.common_code import (
    APIResponse,
    CommonCodeCreate,
    CommonCodeListResponse,
    CommonCodeResponse,
    CommonCodeUpdate,
)

router = APIRouter()

crud_common_code = CRUDBase[CommonCode, CommonCodeCreate, CommonCodeUpdate](CommonCode)


@router.get(
    "",
    response_model=CommonCodeListResponse,
    summary="공통 코드 목록 조회",
)
def get_common_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    code_group: Optional[str] = Query(None, description="코드 그룹 필터"),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CommonCodeListResponse:
    """공통 코드 목록 조회."""
    query = db.query(CommonCode).filter(CommonCode.is_deleted == False)

    if code_group:
        query = query.filter(CommonCode.code_group == code_group)

    if is_active is not None:
        query = query.filter(CommonCode.is_active == is_active)

    total = query.count()
    codes = (
        query.order_by(CommonCode.code_group, CommonCode.sort_order)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return CommonCodeListResponse(
        success=True,
        message="공통 코드 목록 조회 성공",
        data=[CommonCodeResponse.model_validate(c) for c in codes],
        total=total,
    )


@router.get(
    "/groups",
    response_model=APIResponse,
    summary="공통 코드 그룹 목록 조회",
    description="존재하는 모든 코드 그룹명을 반환합니다.",
)
def get_code_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통 코드 그룹 목록 조회."""
    from sqlalchemy import distinct

    groups = (
        db.query(distinct(CommonCode.code_group))
        .filter(CommonCode.is_deleted == False, CommonCode.is_active == True)
        .order_by(CommonCode.code_group)
        .all()
    )

    return APIResponse(
        success=True,
        message="코드 그룹 목록 조회 성공",
        data=[g[0] for g in groups],
        total=len(groups),
    )


@router.get(
    "/group/{code_group}",
    response_model=APIResponse,
    summary="코드 그룹별 공통 코드 조회",
    description="특정 코드 그룹에 속한 모든 코드를 반환합니다.",
)
def get_codes_by_group(
    code_group: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """코드 그룹별 공통 코드 조회."""
    codes = (
        db.query(CommonCode)
        .filter(
            CommonCode.code_group == code_group,
            CommonCode.is_deleted == False,
            CommonCode.is_active == True,
        )
        .order_by(CommonCode.sort_order)
        .all()
    )

    return APIResponse(
        success=True,
        message=f"'{code_group}' 그룹 코드 조회 성공",
        data=[CommonCodeResponse.model_validate(c) for c in codes],
        total=len(codes),
    )


@router.get(
    "/{code_id}",
    response_model=APIResponse,
    summary="공통 코드 상세 조회",
)
def get_common_code(
    code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통 코드 상세 조회."""
    code = crud_common_code.get(db, id=code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {code_id}인 공통 코드를 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="공통 코드 조회 성공",
        data=CommonCodeResponse.model_validate(code),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공통 코드 등록",
)
def create_common_code(
    code_in: CommonCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통 코드 등록."""
    # 그룹 + 코드 중복 체크
    existing = (
        db.query(CommonCode)
        .filter(
            CommonCode.code_group == code_in.code_group,
            CommonCode.code == code_in.code,
            CommonCode.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"코드 그룹 '{code_in.code_group}'에 코드 '{code_in.code}'이 이미 존재합니다.",
        )

    code = crud_common_code.create(
        db,
        obj_in=code_in,
        created_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="공통 코드 등록 성공",
        data=CommonCodeResponse.model_validate(code),
    )


@router.put(
    "/{code_id}",
    response_model=APIResponse,
    summary="공통 코드 수정",
)
def update_common_code(
    code_id: int,
    code_in: CommonCodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통 코드 수정."""
    code = crud_common_code.get(db, id=code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {code_id}인 공통 코드를 찾을 수 없습니다.",
        )

    code = crud_common_code.update(
        db,
        db_obj=code,
        obj_in=code_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="공통 코드 수정 성공",
        data=CommonCodeResponse.model_validate(code),
    )


@router.delete(
    "/{code_id}",
    response_model=APIResponse,
    summary="공통 코드 삭제",
)
def delete_common_code(
    code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통 코드 소프트 삭제."""
    code = crud_common_code.get(db, id=code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {code_id}인 공통 코드를 찾을 수 없습니다.",
        )

    crud_common_code.remove(db, id=code_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"공통 코드 '{code.code_group}.{code.code}'이 삭제되었습니다.",
    )
