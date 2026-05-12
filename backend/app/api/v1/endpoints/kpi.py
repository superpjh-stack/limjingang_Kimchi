"""KPI 엔드포인트 모듈.

대시보드 요약, 생산 KPI, 수주 KPI, 재고 현황 KPI API를 제공합니다.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.kpi import crud_kpi
from app.models.user import User
from app.schemas.inventory import APIResponse

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=APIResponse,
    summary="대시보드 요약 (오늘 현황)",
)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """오늘의 생산 현황, 이번 달 수주 현황, 재고 경고 건수를 반환합니다."""
    data = crud_kpi.get_dashboard_summary(db)
    return APIResponse(
        success=True,
        message="대시보드 요약 조회 성공",
        data=data,
    )


@router.get(
    "/production",
    response_model=APIResponse,
    summary="생산 KPI",
)
def get_production_kpi(
    date_from: date = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="조회 종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """기간별 생산 KPI를 집계합니다.
    - 일별 계획/실적/불량 수량
    - 달성률, 불량률, 시간당 생산량
    - 일별 트렌드
    """
    data = crud_kpi.get_production_kpi(db, date_from=date_from, date_to=date_to)
    return APIResponse(
        success=True,
        message="생산 KPI 조회 성공",
        data=data,
    )


@router.get(
    "/orders",
    response_model=APIResponse,
    summary="수주 KPI",
)
def get_order_kpi(
    date_from: date = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="조회 종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """기간별 수주 KPI를 집계합니다.
    - 총 수주 건수/금액
    - 상태별 분포
    - 거래처별 상위 10
    """
    data = crud_kpi.get_order_kpi(db, date_from=date_from, date_to=date_to)
    return APIResponse(
        success=True,
        message="수주 KPI 조회 성공",
        data=data,
    )


@router.get(
    "/inventory",
    response_model=APIResponse,
    summary="재고 현황 KPI",
)
def get_inventory_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """현재 재고 현황 KPI를 반환합니다.
    - 원자재 재고 부족/유통기한 경고 목록
    - 완제품 총 재고량
    - 유통기한 30일 이내 품목
    """
    data = crud_kpi.get_inventory_kpi(db)
    return APIResponse(
        success=True,
        message="재고 현황 KPI 조회 성공",
        data=data,
    )
