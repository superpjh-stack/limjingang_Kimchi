"""OEE(설비종합효율) 엔드포인트 모듈.

엔드포인트:
- GET  /oee/dashboard                         — 전체 설비 OEE 요약
- GET  /oee/equipment/{equipment_id}/trend     — 설비별 OEE 트렌드
- POST /oee/equipment/{equipment_id}/calculate — 작업실적으로부터 OEE 계산
- POST /oee/record                             — OEE 수동 입력
- GET  /oee/records                            — OEE 기록 목록
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.oee import crud_oee
from app.models.user import User
from app.schemas.inventory import APIResponse
from app.schemas.oee import OeeRecordCreate, OeeRecordListResponse, OeeRecordResponse

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=APIResponse,
    summary="OEE 대시보드 (전체 설비 요약)",
)
def get_oee_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """전체 설비 OEE 요약 및 최근 30일 트렌드를 반환합니다."""
    data = crud_oee.get_dashboard(db)
    return APIResponse(
        success=True,
        message="OEE 대시보드 조회 성공",
        data=data,
    )


@router.get(
    "/equipment/{equipment_id}/trend",
    response_model=APIResponse,
    summary="설비별 OEE 트렌드",
)
def get_equipment_oee_trend(
    equipment_id: int,
    days: int = Query(30, ge=1, le=365, description="조회 기간 (일수)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비별 OEE 트렌드를 반환합니다."""
    records = crud_oee.get_trend(db, equipment_id=equipment_id, days=days)
    return APIResponse(
        success=True,
        message=f"설비 {equipment_id} OEE 트렌드 조회 성공",
        data=[OeeRecordResponse.model_validate(r).model_dump() for r in records],
        total=len(records),
    )


@router.post(
    "/equipment/{equipment_id}/calculate",
    response_model=APIResponse,
    summary="작업실적으로부터 OEE 자동 계산",
)
def calculate_oee_from_work_orders(
    equipment_id: int,
    target_date: date = Query(..., description="계산 대상 일자 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """해당 설비의 작업지시 실적으로부터 OEE를 자동 계산합니다."""
    record = crud_oee.calculate_from_work_orders(
        db,
        equipment_id=equipment_id,
        target_date=target_date,
        created_by=current_user.username,
    )
    return APIResponse(
        success=True,
        message="OEE 자동 계산 완료",
        data=OeeRecordResponse.model_validate(record).model_dump(),
    )


@router.post(
    "/record",
    response_model=APIResponse,
    summary="OEE 수동 입력",
    status_code=201,
)
def create_oee_record(
    data: OeeRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """OEE 기록을 수동으로 입력합니다. 동일 설비+일자 존재 시 업데이트됩니다."""
    record = crud_oee.create_or_update(db, data=data, created_by=current_user.username)
    return APIResponse(
        success=True,
        message="OEE 기록 저장 완료",
        data=OeeRecordResponse.model_validate(record).model_dump(),
    )


@router.get(
    "/records",
    response_model=OeeRecordListResponse,
    summary="OEE 기록 목록 조회",
)
def list_oee_records(
    equipment_id: Optional[int] = Query(None, description="설비 ID 필터"),
    date_from: Optional[date] = Query(None, description="시작일"),
    date_to: Optional[date] = Query(None, description="종료일"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OeeRecordListResponse:
    """OEE 기록 목록을 조회합니다."""
    items, total = crud_oee.get_list(
        db,
        equipment_id=equipment_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return OeeRecordListResponse(
        success=True,
        message="OEE 기록 목록 조회 성공",
        data=[OeeRecordResponse.model_validate(item) for item in items],
        total=total,
    )
