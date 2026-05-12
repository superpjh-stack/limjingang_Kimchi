"""공정 관리 엔드포인트 모듈.

공정 및 CCP 기준값 CRUD API를 제공합니다.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.process import CCPStandard, Process
from app.models.user import User
from app.schemas.user import APIResponse

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse,
    summary="공정 목록 조회",
)
def get_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_ccp: Optional[bool] = Query(None, description="CCP 여부 필터"),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공정 목록 조회."""
    query = db.query(Process).filter(Process.is_deleted == False)

    if is_ccp is not None:
        query = query.filter(Process.is_ccp == is_ccp)

    if is_active is not None:
        query = query.filter(Process.is_active == is_active)

    total = query.count()
    processes = query.order_by(Process.sequence).offset(skip).limit(limit).all()

    return APIResponse(
        success=True,
        message="공정 목록 조회 성공",
        data=[jsonable_encoder(p) for p in processes],
        total=total,
    )


@router.get(
    "/{process_id}",
    response_model=APIResponse,
    summary="공정 상세 조회 (CCP 기준값 포함)",
)
def get_process(
    process_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공정 상세 조회."""
    process = (
        db.query(Process)
        .filter(Process.id == process_id, Process.is_deleted == False)
        .first()
    )
    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {process_id}인 공정을 찾을 수 없습니다.",
        )

    return APIResponse(
        success=True,
        message="공정 조회 성공",
        data=jsonable_encoder(process),
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공정 등록",
)
def create_process(
    process_in: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공정 등록."""
    db_process = Process(
        **process_in,
        created_by=current_user.username,
        updated_by=current_user.username,
    )
    db.add(db_process)
    db.commit()
    db.refresh(db_process)

    return APIResponse(
        success=True,
        message="공정 등록 성공",
        data=jsonable_encoder(db_process),
    )


@router.put(
    "/{process_id}",
    response_model=APIResponse,
    summary="공정 수정",
)
def update_process(
    process_id: int,
    process_in: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공정 수정."""
    process = (
        db.query(Process)
        .filter(Process.id == process_id, Process.is_deleted == False)
        .first()
    )
    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {process_id}인 공정을 찾을 수 없습니다.",
        )

    for field, value in process_in.items():
        if hasattr(process, field):
            setattr(process, field, value)

    process.updated_by = current_user.username
    db.commit()
    db.refresh(process)

    return APIResponse(
        success=True,
        message="공정 수정 성공",
        data=jsonable_encoder(process),
    )


@router.delete(
    "/{process_id}",
    response_model=APIResponse,
    summary="공정 삭제",
)
def delete_process(
    process_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """공정 소프트 삭제."""
    process = (
        db.query(Process)
        .filter(Process.id == process_id, Process.is_deleted == False)
        .first()
    )
    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {process_id}인 공정을 찾을 수 없습니다.",
        )

    process.is_deleted = True
    process.updated_by = current_user.username
    db.commit()

    return APIResponse(
        success=True,
        message=f"공정 '{process.process_name}'이 삭제되었습니다.",
    )
