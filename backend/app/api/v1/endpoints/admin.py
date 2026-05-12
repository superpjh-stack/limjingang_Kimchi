"""시스템관리 엔드포인트 모듈 (관리자 전용).

Sprint 4 신규 API:
- 사용자 관리 (등록/조회/수정/삭제/비밀번호 초기화/상태 변경)
- 역할 관리 (목록 조회, 사용자-역할 부여/제거)
- 공통코드 관리 (등록/조회/수정/삭제/그룹 목록)
"""

import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user, get_current_admin_user
from app.core.security import get_password_hash
from app.crud.base import CRUDBase
from app.crud.user import crud_user
from app.models.common_code import CommonCode
from app.models.user import Role, User, UserRole
from app.schemas.common_code import (
    CommonCodeCreate,
    CommonCodeListResponse,
    CommonCodeResponse,
    CommonCodeUpdate,
)
from app.schemas.user import APIResponse, UserCreate, UserListResponse, UserResponse, UserUpdate

router = APIRouter()

crud_common_code = CRUDBase[CommonCode, CommonCodeCreate, CommonCodeUpdate](CommonCode)
crud_role = CRUDBase[Role, UserCreate, UserUpdate](Role)


# ============================================================
# 사용자 관리
# ============================================================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="전체 사용자 목록 조회 (관리자)",
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="검색어 (username 또는 full_name)"),
    department: Optional[str] = Query(None, description="부서 필터"),
    is_active: Optional[bool] = Query(None, description="활성 여부 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> UserListResponse:
    """전체 사용자 목록을 조회합니다 (관리자 전용)."""
    query = db.query(User).filter(User.is_deleted == False)

    if search:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                User.username.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
            )
        )
    if department:
        query = query.filter(User.department == department)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    users = query.order_by(User.username).offset(skip).limit(limit).all()

    return UserListResponse(
        success=True,
        message="사용자 목록 조회 성공",
        data=[UserResponse.model_validate(u) for u in users],
        total=total,
    )


@router.post(
    "/users",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="신규 사용자 등록 (관리자)",
)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """신규 사용자를 등록합니다 (관리자 전용)."""
    existing = crud_user.get_by_username(db, username=user_in.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"사용자명 '{user_in.username}'이 이미 존재합니다.",
        )

    user = crud_user.create(db, obj_in=user_in, created_by=current_user.username)

    return APIResponse(
        success=True,
        message="사용자 등록 성공",
        data=UserResponse.model_validate(user),
    )


@router.put(
    "/users/{user_id}",
    response_model=APIResponse,
    summary="사용자 정보 수정 (관리자)",
)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자 정보를 수정합니다 (비밀번호 제외, 관리자 전용)."""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {user_id}인 사용자를 찾을 수 없습니다.",
        )

    # 이 엔드포인트에서는 비밀번호 변경 불가 (전용 엔드포인트 사용)
    user_in_data = user_in.model_copy(update={"password": None})

    updated = crud_user.update(
        db,
        db_obj=user,
        obj_in=user_in_data,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="사용자 정보 수정 성공",
        data=UserResponse.model_validate(updated),
    )


@router.post(
    "/users/{user_id}/reset-password",
    response_model=APIResponse,
    summary="비밀번호 초기화 (관리자)",
)
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자 비밀번호를 임시 비밀번호로 초기화합니다 (관리자 전용).

    반환된 임시 비밀번호는 한 번만 표시됩니다. 즉시 변경을 안내하세요.
    """
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {user_id}인 사용자를 찾을 수 없습니다.",
        )

    # 임시 비밀번호 생성: 영문 대소문자 + 숫자 + 특수문자 12자리
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    temp_password = "".join(secrets.choice(alphabet) for _ in range(12))

    user.hashed_password = get_password_hash(temp_password)
    user.updated_by = current_user.username
    db.add(user)
    db.commit()

    return APIResponse(
        success=True,
        message="비밀번호 초기화 성공. 반환된 임시 비밀번호를 사용자에게 안전하게 전달하고 즉시 변경을 안내하세요.",
        data={"username": user.username, "temp_password": temp_password},
    )


@router.put(
    "/users/{user_id}/status",
    response_model=APIResponse,
    summary="사용자 계정 활성/비활성 변경 (관리자)",
)
def update_user_status(
    user_id: int,
    is_active: bool = Query(..., description="활성화 여부"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자 계정을 활성화 또는 비활성화합니다 (관리자 전용)."""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {user_id}인 사용자를 찾을 수 없습니다.",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신의 계정 상태는 변경할 수 없습니다.",
        )

    user.is_active = is_active
    user.updated_by = current_user.username
    db.add(user)
    db.commit()
    db.refresh(user)

    action = "활성화" if is_active else "비활성화"
    return APIResponse(
        success=True,
        message=f"사용자 '{user.username}' 계정 {action} 성공",
        data=UserResponse.model_validate(user),
    )


@router.delete(
    "/users/{user_id}",
    response_model=APIResponse,
    summary="사용자 계정 삭제 (관리자, 소프트 삭제)",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자 계정을 소프트 삭제합니다 (관리자 전용)."""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {user_id}인 사용자를 찾을 수 없습니다.",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신의 계정은 삭제할 수 없습니다.",
        )

    crud_user.remove(db, id=user_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"사용자 '{user.username}' 계정이 삭제되었습니다.",
    )


# ============================================================
# 역할 관리
# ============================================================

@router.get(
    "/roles",
    response_model=APIResponse,
    summary="역할 목록 조회 (관리자)",
)
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """시스템 역할 목록을 조회합니다."""
    roles = db.query(Role).filter(Role.is_deleted == False).order_by(Role.role_code).all()

    return APIResponse(
        success=True,
        message="역할 목록 조회 성공",
        data=[
            {
                "id": r.id,
                "role_code": r.role_code,
                "role_name": r.role_name,
                "description": r.description,
            }
            for r in roles
        ],
        total=len(roles),
    )


@router.post(
    "/users/{user_id}/roles",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="사용자 역할 부여 (관리자)",
)
def assign_role(
    user_id: int,
    role_id: int = Query(..., description="부여할 역할 ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자에게 역할을 부여합니다 (관리자 전용)."""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {user_id}인 사용자를 찾을 수 없습니다.",
        )

    role = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {role_id}인 역할을 찾을 수 없습니다.",
        )

    # 중복 부여 확인
    existing = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"사용자 '{user.username}'에게 이미 역할 '{role.role_code}'이 부여되어 있습니다.",
        )

    user_role = UserRole(
        user_id=user_id,
        role_id=role_id,
        created_by=current_user.username,
        updated_by=current_user.username,
    )
    db.add(user_role)
    db.commit()

    return APIResponse(
        success=True,
        message=f"사용자 '{user.username}'에게 역할 '{role.role_code}' 부여 성공",
        data={"user_id": user_id, "role_id": role_id, "role_code": role.role_code},
    )


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    response_model=APIResponse,
    summary="사용자 역할 제거 (관리자)",
)
def remove_role(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """사용자의 역할을 제거합니다 (관리자 전용)."""
    user_role = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.is_deleted == False,
        )
        .first()
    )
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 사용자-역할 매핑을 찾을 수 없습니다.",
        )

    user_role.is_deleted = True
    user_role.updated_by = current_user.username
    db.add(user_role)
    db.commit()

    return APIResponse(
        success=True,
        message="역할 제거 성공",
    )


# ============================================================
# 공통코드 관리
# ============================================================

@router.get(
    "/common-codes/groups",
    response_model=APIResponse,
    summary="공통코드 그룹 목록 조회",
)
def list_code_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공통코드 그룹(code_group) 목록을 조회합니다."""
    from sqlalchemy import distinct

    groups = (
        db.query(distinct(CommonCode.code_group))
        .filter(CommonCode.is_deleted == False)
        .order_by(CommonCode.code_group)
        .all()
    )
    group_list = [g[0] for g in groups]

    return APIResponse(
        success=True,
        message="공통코드 그룹 목록 조회 성공",
        data=group_list,
        total=len(group_list),
    )


@router.get(
    "/common-codes",
    response_model=CommonCodeListResponse,
    summary="공통코드 목록 조회",
)
def list_common_codes(
    code_group: Optional[str] = Query(None, description="그룹 필터"),
    is_active: Optional[bool] = Query(None, description="활성 여부 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CommonCodeListResponse:
    """공통코드 목록을 조회합니다."""
    query = db.query(CommonCode).filter(CommonCode.is_deleted == False)

    if code_group:
        query = query.filter(CommonCode.code_group == code_group)
    if is_active is not None:
        query = query.filter(CommonCode.is_active == is_active)

    total = query.count()
    codes = (
        query.order_by(CommonCode.code_group, CommonCode.sort_order, CommonCode.code)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return CommonCodeListResponse(
        success=True,
        message="공통코드 목록 조회 성공",
        data=[CommonCodeResponse.model_validate(c) for c in codes],
        total=total,
    )


@router.post(
    "/common-codes",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공통코드 등록 (관리자)",
)
def create_common_code(
    code_in: CommonCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """공통코드를 등록합니다 (관리자 전용)."""
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

    code = crud_common_code.create(db, obj_in=code_in, created_by=current_user.username)

    return APIResponse(
        success=True,
        message="공통코드 등록 성공",
        data=CommonCodeResponse.model_validate(code),
    )


@router.put(
    "/common-codes/{code_id}",
    response_model=APIResponse,
    summary="공통코드 수정 (관리자)",
)
def update_common_code(
    code_id: int,
    code_in: CommonCodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """공통코드를 수정합니다 (관리자 전용)."""
    code = crud_common_code.get(db, id=code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {code_id}인 공통코드를 찾을 수 없습니다.",
        )

    updated = crud_common_code.update(
        db,
        db_obj=code,
        obj_in=code_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="공통코드 수정 성공",
        data=CommonCodeResponse.model_validate(updated),
    )


@router.delete(
    "/common-codes/{code_id}",
    response_model=APIResponse,
    summary="공통코드 삭제 (관리자, 소프트 삭제)",
)
def delete_common_code(
    code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> APIResponse:
    """공통코드를 소프트 삭제합니다 (관리자 전용)."""
    code = crud_common_code.get(db, id=code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {code_id}인 공통코드를 찾을 수 없습니다.",
        )

    crud_common_code.remove(db, id=code_id, deleted_by=current_user.username)

    return APIResponse(
        success=True,
        message=f"공통코드 '{code.code_group}/{code.code}' 삭제 성공",
    )
