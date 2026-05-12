"""LOT 추적 이력 엔드포인트 모듈.

엔드포인트:
- GET  /lot-trace           — 전체 이력 목록 (필터)
- GET  /lot-trace/{lot_no}/timeline — LOT 번호 타임라인
- POST /lot-trace           — 이력 수동 추가
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.lot_trace import crud_lot_trace
from app.models.user import User
from app.schemas.inventory import APIResponse
from app.schemas.lot_trace import LotTimelineResponse, LotTraceCreate, LotTraceListResponse, LotTraceResponse

router = APIRouter()


@router.get(
    "",
    response_model=LotTraceListResponse,
    summary="LOT 이력 목록 조회",
)
def list_lot_traces(
    lot_no: Optional[str] = Query(None, description="LOT 번호 (부분 일치)"),
    trace_type: Optional[str] = Query(None, description="이력 유형 (RECEIVE/PRODUCTION/PROCESS/SHIPMENT/QC)"),
    date_from: Optional[datetime] = Query(None, description="시작 일시"),
    date_to: Optional[datetime] = Query(None, description="종료 일시"),
    skip: int = Query(0, ge=0, description="오프셋"),
    limit: int = Query(50, ge=1, le=200, description="최대 반환 수"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LotTraceListResponse:
    """LOT 추적 이력 목록을 조회합니다."""
    items, total = crud_lot_trace.search(
        db,
        lot_no=lot_no,
        trace_type=trace_type,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return LotTraceListResponse(
        success=True,
        message="LOT 이력 목록 조회 성공",
        data=[LotTraceResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get(
    "/{lot_no}/timeline",
    response_model=APIResponse,
    summary="LOT 번호 타임라인 조회",
)
def get_lot_timeline(
    lot_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """LOT 번호의 전체 이력 타임라인을 반환합니다."""
    result = crud_lot_trace.get_timeline(db, lot_no=lot_no)
    # timeline 리스트를 직렬화
    result["timeline"] = [LotTraceResponse.model_validate(t).model_dump() for t in result["timeline"]]
    # summary의 datetime을 str 변환
    summary = result["summary"]
    if summary.get("first_event") and hasattr(summary["first_event"], "isoformat"):
        summary["first_event"] = summary["first_event"].isoformat()
    if summary.get("last_event") and hasattr(summary["last_event"], "isoformat"):
        summary["last_event"] = summary["last_event"].isoformat()

    return APIResponse(
        success=True,
        message=f"LOT {lot_no} 타임라인 조회 성공",
        data=result,
    )


@router.post(
    "",
    response_model=APIResponse,
    summary="LOT 이력 수동 추가",
    status_code=201,
)
def create_lot_trace(
    data: LotTraceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """LOT 추적 이력을 수동으로 추가합니다 (관리자)."""
    item = crud_lot_trace.create(db, data=data, created_by=current_user.username)
    return APIResponse(
        success=True,
        message="LOT 이력 추가 성공",
        data=LotTraceResponse.model_validate(item).model_dump(),
    )
