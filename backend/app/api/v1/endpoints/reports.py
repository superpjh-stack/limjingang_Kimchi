"""생산 보고서 엔드포인트 모듈.

엔드포인트:
- GET /reports/daily          — 일별 보고서
- GET /reports/weekly         — 주별 보고서
- GET /reports/monthly        — 월별 보고서
- GET /reports/export/excel   — Excel 파일 다운로드
"""

import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.report import crud_report
from app.models.user import User
from app.schemas.inventory import APIResponse

router = APIRouter()


@router.get(
    "/daily",
    response_model=APIResponse,
    summary="일별 생산 보고서",
)
def get_daily_report(
    target_date: date = Query(..., description="조회 일자 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """일별 생산 보고서를 반환합니다."""
    report = crud_report.get_daily(db, target_date=target_date)
    return APIResponse(
        success=True,
        message=f"{target_date} 일별 생산 보고서 조회 성공",
        data=report,
    )


@router.get(
    "/weekly",
    response_model=APIResponse,
    summary="주별 생산 보고서",
)
def get_weekly_report(
    week_start: date = Query(..., description="주 시작일 (월요일, YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """주별 생산 보고서를 반환합니다."""
    report = crud_report.get_weekly(db, week_start=week_start)
    return APIResponse(
        success=True,
        message=f"{week_start} 주별 생산 보고서 조회 성공",
        data=report,
    )


@router.get(
    "/monthly",
    response_model=APIResponse,
    summary="월별 생산 보고서",
)
def get_monthly_report(
    year: int = Query(..., ge=2020, le=2099, description="연도"),
    month: int = Query(..., ge=1, le=12, description="월"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """월별 생산 보고서를 반환합니다."""
    report = crud_report.get_monthly(db, year=year, month=month)
    return APIResponse(
        success=True,
        message=f"{year}년 {month}월 생산 보고서 조회 성공",
        data=report,
    )


@router.get(
    "/export/excel",
    summary="생산 보고서 Excel 다운로드",
    response_class=StreamingResponse,
)
def export_excel(
    report_type: str = Query("daily", description="보고서 유형 (daily/weekly/monthly)"),
    target_date: date = Query(None, description="일별 보고서 날짜"),
    week_start: date = Query(None, description="주별 보고서 시작일"),
    year: int = Query(None, description="월별 보고서 연도"),
    month: int = Query(None, description="월별 보고서 월"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> StreamingResponse:
    """생산 보고서를 Excel 파일로 다운로드합니다."""
    # 기본값 처리
    today = date.today()

    kwargs: dict = {}
    if report_type == "daily":
        kwargs["date"] = target_date or today
        filename_date = str(kwargs["date"])
    elif report_type == "weekly":
        kwargs["week_start"] = week_start or today
        filename_date = str(kwargs["week_start"])
    elif report_type == "monthly":
        kwargs["year"] = year or today.year
        kwargs["month"] = month or today.month
        filename_date = f"{kwargs['year']}-{kwargs['month']:02d}"
    else:
        kwargs["date"] = target_date or today
        filename_date = str(kwargs.get("date", today))

    excel_bytes = crud_report.export_excel(db, report_type=report_type, **kwargs)

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=production_report_{filename_date}.xlsx"
        },
    )
