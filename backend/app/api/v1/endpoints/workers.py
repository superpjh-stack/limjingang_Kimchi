"""작업자 엔드포인트 모듈.

`TB_WORKER` 마스터 데이터를 다룹니다. 프론트 `master/workers` 페이지가 이 API 를 호출합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.worker import crud_worker
from app.models.user import User
from app.schemas.worker import (
    WorkerAPIResponse,
    WorkerCreate,
    WorkerListResponse,
    WorkerResponse,
    WorkerUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=WorkerListResponse,
    summary="작업자 목록 조회",
)
def get_workers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, description="이름/사원번호 검색"),
    department: Optional[str] = Query(None, description="부서 필터"),
    shift: Optional[str] = Query(None, description="교대조 필터"),
    status: Optional[str] = Query(None, description="재직 상태 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkerListResponse:
    """페이지네이션 및 필터를 적용한 작업자 목록을 반환합니다."""
    items, total = crud_worker.get_multi_with_filter(
        db,
        skip=skip,
        limit=limit,
        search=search,
        department=department,
        shift=shift,
        status=status,
    )
    return WorkerListResponse(
        success=True,
        message="작업자 목록 조회 성공",
        data=[WorkerResponse.model_validate(w) for w in items],
        total=total,
    )


@router.get(
    "/{worker_id}",
    response_model=WorkerAPIResponse,
    summary="작업자 상세 조회",
)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkerAPIResponse:
    worker = crud_worker.get(db, id=worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {worker_id}인 작업자를 찾을 수 없습니다.",
        )
    return WorkerAPIResponse(
        success=True,
        message="작업자 조회 성공",
        data=WorkerResponse.model_validate(worker),
    )


@router.post(
    "",
    response_model=WorkerAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="작업자 등록",
)
def create_worker(
    worker_in: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkerAPIResponse:
    # 사원번호 중복 체크
    existing = crud_worker.get_by_emp_no(db, emp_no=worker_in.emp_no)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"사원번호 '{worker_in.emp_no}' 가 이미 존재합니다.",
        )
    worker = crud_worker.create(db, obj_in=worker_in, created_by=current_user.username)
    return WorkerAPIResponse(
        success=True,
        message="작업자 등록 성공",
        data=WorkerResponse.model_validate(worker),
    )


@router.put(
    "/{worker_id}",
    response_model=WorkerAPIResponse,
    summary="작업자 수정",
)
def update_worker(
    worker_id: int,
    worker_in: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkerAPIResponse:
    worker = crud_worker.get(db, id=worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {worker_id}인 작업자를 찾을 수 없습니다.",
        )
    worker = crud_worker.update(
        db, db_obj=worker, obj_in=worker_in, updated_by=current_user.username
    )
    return WorkerAPIResponse(
        success=True,
        message="작업자 수정 성공",
        data=WorkerResponse.model_validate(worker),
    )


@router.delete(
    "/{worker_id}",
    response_model=WorkerAPIResponse,
    summary="작업자 삭제 (소프트 삭제)",
)
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkerAPIResponse:
    worker = crud_worker.get(db, id=worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {worker_id}인 작업자를 찾을 수 없습니다.",
        )
    crud_worker.remove(db, id=worker_id, deleted_by=current_user.username)
    return WorkerAPIResponse(
        success=True,
        message=f"작업자 '{worker.name}' 가 삭제되었습니다.",
    )
