"""알림 엔드포인트 모듈.

엔드포인트:
- GET  /notifications            — 알림 목록 (is_read, severity 필터)
- GET  /notifications/count      — 읽지 않은 알림 수
- PUT  /notifications/{id}/read  — 읽음 처리
- PUT  /notifications/read-all   — 전체 읽음
- POST /notifications/trigger-check — 시스템 체크 및 알림 생성
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.notification import crud_notification
from app.models.user import User
from app.schemas.inventory import APIResponse
from app.schemas.notification import (
    NotificationCountResponse,
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="알림 목록 조회",
)
def list_notifications(
    is_read: Optional[bool] = Query(None, description="읽음 여부 필터"),
    severity: Optional[str] = Query(None, description="심각도 필터 (INFO/WARNING/DANGER)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> NotificationListResponse:
    """알림 목록을 조회합니다."""
    items, total = crud_notification.get_list(
        db,
        is_read=is_read,
        severity=severity,
        skip=skip,
        limit=limit,
    )
    counts = crud_notification.get_count(db)
    return NotificationListResponse(
        success=True,
        message="알림 목록 조회 성공",
        data=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        unread_count=counts["unread_count"],
    )


@router.get(
    "/count",
    response_model=APIResponse,
    summary="알림 카운트 조회",
)
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """읽지 않은 알림 수를 반환합니다."""
    counts = crud_notification.get_count(db)
    return APIResponse(
        success=True,
        message="알림 카운트 조회 성공",
        data=counts,
    )


@router.put(
    "/read-all",
    response_model=APIResponse,
    summary="전체 알림 읽음 처리",
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """읽지 않은 모든 알림을 읽음 처리합니다."""
    count = crud_notification.mark_all_read(db, username=current_user.username)
    return APIResponse(
        success=True,
        message=f"{count}건 읽음 처리 완료",
        data={"updated_count": count},
    )


@router.put(
    "/{notification_id}/read",
    response_model=APIResponse,
    summary="알림 읽음 처리",
)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """특정 알림을 읽음 처리합니다."""
    from fastapi import HTTPException

    item = crud_notification.mark_read(
        db,
        notification_id=notification_id,
        username=current_user.username,
    )
    if not item:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    return APIResponse(
        success=True,
        message="읽음 처리 완료",
        data=NotificationResponse.model_validate(item).model_dump(),
    )


@router.post(
    "/trigger-check",
    response_model=APIResponse,
    summary="시스템 상태 체크 및 알림 자동 생성",
)
def trigger_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """시스템 상태를 체크하고 알림을 자동 생성합니다.

    체크 항목: 재고 부족, CCP 이탈, 설비 고장, 납기 위험 수주
    """
    created = crud_notification.trigger_check(db)
    return APIResponse(
        success=True,
        message=f"시스템 체크 완료. {len(created)}건 알림 생성",
        data={
            "created_count": len(created),
            "notifications": [NotificationResponse.model_validate(n).model_dump() for n in created],
        },
    )
