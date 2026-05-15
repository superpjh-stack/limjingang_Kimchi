"""품질관리 엔드포인트 모듈.

금속검출 기록(CCP4) 등록/조회/통계 및 품질 이슈 등록/조회/상태변경/담당자배정 API를 제공합니다.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.order import APIResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class MetalDetectCreate(BaseModel):
    """금속검출 결과 등록 스키마."""

    detector_id: str = Field(..., max_length=10, description="검출기 ID (MD-01, MD-02, MD-03)")
    product_code: str = Field(..., max_length=20, description="제품 코드")
    product_name: str = Field(..., max_length=100, description="제품명")
    batch_no: str = Field(..., max_length=30, description="배치 번호")
    result: str = Field(..., description="검사 결과 (PASS / FAIL)")
    detection_type: Optional[str] = Field(None, max_length=20, description="검출 유형 (Fe/Sus/Non-Fe, FAIL시)")
    detection_size_mm: Optional[float] = Field(None, gt=0, description="검출 크기 mm (FAIL시)")
    action_taken: Optional[str] = Field(None, max_length=100, description="조치사항 (FAIL시 필수)")
    inspector: str = Field(..., max_length=50, description="검사자")
    inspected_at: Optional[datetime] = Field(None, description="검사 일시 (미입력 시 현재 시각)")
    notes: Optional[str] = Field(None, description="비고")


class QualityIssueCreate(BaseModel):
    """품질 이슈 등록 스키마."""

    issue_type: str = Field(
        ...,
        description="이슈 유형 (CCP이탈/이물질/금속검출FAIL/불량률초과/관능검사이상/기타)",
    )
    severity: str = Field(..., description="심각도 (CRITICAL/HIGH/MEDIUM/LOW)")
    title: str = Field(..., max_length=200, description="이슈 제목")
    description: Optional[str] = Field(None, description="이슈 상세 내용")
    occurred_at: datetime = Field(..., description="발생 일시")
    detected_by: str = Field(..., max_length=50, description="검출자")
    assigned_to: Optional[str] = Field(None, max_length=50, description="담당자")
    related_batch: Optional[str] = Field(None, max_length=30, description="관련 배치 번호")


class QualityIssueStatusUpdate(BaseModel):
    """품질 이슈 상태 변경 스키마."""

    status: str = Field(
        ..., description="변경할 상태 (OPEN/IN_PROGRESS/RESOLVED/CLOSED)"
    )
    resolution: Optional[str] = Field(None, description="해결 내용 (RESOLVED/CLOSED 시)")


class QualityIssueAssign(BaseModel):
    """품질 이슈 담당자 배정 스키마."""

    assigned_to: str = Field(..., max_length=50, description="담당자 이름")


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

def _generate_issue_no(db: Session) -> str:
    """ISS-YYYYMMDD-NNN 형태의 이슈 번호를 자동 채번합니다."""
    today = date.today().strftime("%Y%m%d")
    pattern = f"ISS-{today}-%"
    row = db.execute(
        text(
            "SELECT COUNT(*) AS cnt FROM TB_QUALITY_ISSUE WHERE issue_no LIKE :pattern"
        ),
        {"pattern": pattern},
    ).fetchone()
    seq = (row.cnt if row else 0) + 1
    return f"ISS-{today}-{seq:03d}"


_VALID_RESULTS = {"PASS", "FAIL"}
_VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
_VALID_STATUSES = {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}
_STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "OPEN": ["IN_PROGRESS", "CLOSED"],
    "IN_PROGRESS": ["RESOLVED", "OPEN"],
    "RESOLVED": ["CLOSED", "IN_PROGRESS"],
    "CLOSED": [],
}


def _get_issue_or_404(db: Session, issue_id: int) -> Any:
    """이슈 단건 조회 - 없으면 404."""
    row = db.execute(
        text("SELECT * FROM TB_QUALITY_ISSUE WHERE id = :id"),
        {"id": issue_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="품질 이슈를 찾을 수 없습니다.")
    return row


# ---------------------------------------------------------------------------
# 금속검출 엔드포인트
# ---------------------------------------------------------------------------

@router.get(
    "/metal-detect",
    response_model=APIResponse,
    summary="금속검출 기록 목록 조회",
)
def list_metal_detect_logs(
    date: Optional[str] = Query(None, description="검사일 필터 (YYYY-MM-DD)"),
    detector_id: Optional[str] = Query(None, description="검출기 ID 필터 (MD-01 등)"),
    result: Optional[str] = Query(None, description="결과 필터 (PASS / FAIL)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """금속검출 기록을 날짜/검출기/결과 조건으로 조회합니다."""
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if date:
        where_clauses.append("DATE(inspected_at) = :date")
        params["date"] = date
    if detector_id:
        where_clauses.append("detector_id = :detector_id")
        params["detector_id"] = detector_id
    if result:
        where_clauses.append("result = :result")
        params["result"] = result

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_METAL_DETECT_LOG WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_METAL_DETECT_LOG WHERE {where_sql} "
            "ORDER BY inspected_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="금속검출 기록 목록 조회 성공", data=data, total=total)


@router.post(
    "/metal-detect",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="금속검출 결과 등록",
)
def create_metal_detect_log(
    log_in: MetalDetectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """금속검출 검사 결과를 등록합니다. FAIL 건은 action_taken 필드가 필수입니다."""
    if log_in.result not in _VALID_RESULTS:
        raise HTTPException(
            status_code=400,
            detail=f"result는 {_VALID_RESULTS} 중 하나여야 합니다.",
        )
    if log_in.result == "FAIL" and not log_in.action_taken:
        raise HTTPException(
            status_code=400,
            detail="FAIL 결과 등록 시 action_taken(조치사항)은 필수입니다.",
        )

    inspected_at = log_in.inspected_at or datetime.now()

    db.execute(
        text(
            """
            INSERT INTO TB_METAL_DETECT_LOG
              (detector_id, product_code, product_name, batch_no, result,
               detection_type, detection_size_mm, action_taken,
               inspector, inspected_at, notes)
            VALUES
              (:detector_id, :product_code, :product_name, :batch_no, :result,
               :detection_type, :detection_size_mm, :action_taken,
               :inspector, :inspected_at, :notes)
            """
        ),
        {
            "detector_id": log_in.detector_id,
            "product_code": log_in.product_code,
            "product_name": log_in.product_name,
            "batch_no": log_in.batch_no,
            "result": log_in.result,
            "detection_type": log_in.detection_type,
            "detection_size_mm": log_in.detection_size_mm,
            "action_taken": log_in.action_taken,
            "inspector": log_in.inspector,
            "inspected_at": inspected_at,
            "notes": log_in.notes,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_METAL_DETECT_LOG ORDER BY id DESC LIMIT 1")
    ).fetchone()

    return APIResponse(
        success=True,
        message="금속검출 결과가 등록되었습니다.",
        data=dict(row._mapping),
    )


@router.get(
    "/metal-detect/stats/today",
    response_model=APIResponse,
    summary="오늘 금속검출 통계",
)
def get_metal_detect_stats_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """오늘 금속검출 통계를 조회합니다. 총검사수, PASS/FAIL 건수, 검출기별 집계를 반환합니다."""
    today = date.today().strftime("%Y-%m-%d")

    summary_row = db.execute(
        text(
            """
            SELECT
                COUNT(*)                                           AS total_count,
                SUM(CASE WHEN result = 'PASS' THEN 1 ELSE 0 END)  AS pass_count,
                SUM(CASE WHEN result = 'FAIL' THEN 1 ELSE 0 END)  AS fail_count
            FROM TB_METAL_DETECT_LOG
            WHERE DATE(inspected_at) = :today
            """
        ),
        {"today": today},
    ).fetchone()

    by_detector_rows = db.execute(
        text(
            """
            SELECT
                detector_id,
                COUNT(*)                                           AS total_count,
                SUM(CASE WHEN result = 'PASS' THEN 1 ELSE 0 END)  AS pass_count,
                SUM(CASE WHEN result = 'FAIL' THEN 1 ELSE 0 END)  AS fail_count
            FROM TB_METAL_DETECT_LOG
            WHERE DATE(inspected_at) = :today
            GROUP BY detector_id
            ORDER BY detector_id
            """
        ),
        {"today": today},
    ).fetchall()

    data = {
        "date": today,
        "total_count": summary_row.total_count if summary_row else 0,
        "pass_count": summary_row.pass_count if summary_row else 0,
        "fail_count": summary_row.fail_count if summary_row else 0,
        "by_detector": [dict(r._mapping) for r in by_detector_rows],
    }
    return APIResponse(success=True, message="오늘 금속검출 통계 조회 성공", data=data)


# ---------------------------------------------------------------------------
# 품질 이슈 엔드포인트
# ---------------------------------------------------------------------------

@router.get(
    "/issues",
    response_model=APIResponse,
    summary="품질 이슈 목록 조회",
)
def list_quality_issues(
    status: Optional[str] = Query(None, description="상태 필터 (OPEN/IN_PROGRESS/RESOLVED/CLOSED)"),
    severity: Optional[str] = Query(None, description="심각도 필터 (CRITICAL/HIGH/MEDIUM/LOW)"),
    issue_type: Optional[str] = Query(None, description="이슈 유형 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """품질 이슈 목록을 상태/심각도/유형 조건으로 조회합니다."""
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if severity:
        where_clauses.append("severity = :severity")
        params["severity"] = severity
    if issue_type:
        where_clauses.append("issue_type = :issue_type")
        params["issue_type"] = issue_type

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_QUALITY_ISSUE WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_QUALITY_ISSUE WHERE {where_sql} "
            "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="품질 이슈 목록 조회 성공", data=data, total=total)


@router.post(
    "/issues",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="품질 이슈 등록",
)
def create_quality_issue(
    issue_in: QualityIssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """품질 이슈를 등록합니다. issue_no는 ISS-YYYYMMDD-NNN 형태로 자동 채번됩니다."""
    if issue_in.severity not in _VALID_SEVERITIES:
        raise HTTPException(
            status_code=400,
            detail=f"severity는 {_VALID_SEVERITIES} 중 하나여야 합니다.",
        )

    issue_no = _generate_issue_no(db)

    db.execute(
        text(
            """
            INSERT INTO TB_QUALITY_ISSUE
              (issue_no, issue_type, severity, title, description,
               occurred_at, detected_by, assigned_to, related_batch)
            VALUES
              (:issue_no, :issue_type, :severity, :title, :description,
               :occurred_at, :detected_by, :assigned_to, :related_batch)
            """
        ),
        {
            "issue_no": issue_no,
            "issue_type": issue_in.issue_type,
            "severity": issue_in.severity,
            "title": issue_in.title,
            "description": issue_in.description,
            "occurred_at": issue_in.occurred_at,
            "detected_by": issue_in.detected_by,
            "assigned_to": issue_in.assigned_to,
            "related_batch": issue_in.related_batch,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_QUALITY_ISSUE WHERE issue_no = :issue_no"),
        {"issue_no": issue_no},
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"품질 이슈 {issue_no}이 등록되었습니다.",
        data=dict(row._mapping),
    )


@router.get(
    "/issues/{issue_id}",
    response_model=APIResponse,
    summary="품질 이슈 단건 조회",
)
def get_quality_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """품질 이슈 상세 정보를 조회합니다."""
    row = _get_issue_or_404(db, issue_id)
    return APIResponse(success=True, message="품질 이슈 조회 성공", data=dict(row._mapping))


@router.patch(
    "/issues/{issue_id}/status",
    response_model=APIResponse,
    summary="품질 이슈 상태 변경",
)
def update_issue_status(
    issue_id: int,
    status_in: QualityIssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """품질 이슈 상태를 변경합니다. OPEN → IN_PROGRESS → RESOLVED → CLOSED 순서로 전환합니다."""
    row = _get_issue_or_404(db, issue_id)

    if status_in.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status는 {_VALID_STATUSES} 중 하나여야 합니다.",
        )

    allowed_next = _STATUS_TRANSITIONS.get(row.status, [])
    if status_in.status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=(
                f"현재 상태 '{row.status}'에서 '{status_in.status}'로 변경할 수 없습니다. "
                f"가능한 상태: {allowed_next}"
            ),
        )

    set_parts = ["status = :status"]
    params: Dict[str, Any] = {"status": status_in.status, "id": issue_id}

    if status_in.status in ("RESOLVED", "CLOSED"):
        set_parts.append("resolved_at = :resolved_at")
        params["resolved_at"] = datetime.now()
        if status_in.resolution:
            set_parts.append("resolution = :resolution")
            params["resolution"] = status_in.resolution
    elif status_in.resolution:
        set_parts.append("resolution = :resolution")
        params["resolution"] = status_in.resolution

    db.execute(
        text(f"UPDATE TB_QUALITY_ISSUE SET {', '.join(set_parts)} WHERE id = :id"),
        params,
    )
    db.commit()

    updated = db.execute(
        text("SELECT * FROM TB_QUALITY_ISSUE WHERE id = :id"), {"id": issue_id}
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"품질 이슈 {row.issue_no} 상태가 '{status_in.status}'로 변경되었습니다.",
        data=dict(updated._mapping),
    )


@router.patch(
    "/issues/{issue_id}/assign",
    response_model=APIResponse,
    summary="품질 이슈 담당자 배정",
)
def assign_quality_issue(
    issue_id: int,
    assign_in: QualityIssueAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """품질 이슈에 담당자를 배정합니다."""
    row = _get_issue_or_404(db, issue_id)

    db.execute(
        text(
            "UPDATE TB_QUALITY_ISSUE SET assigned_to = :assigned_to WHERE id = :id"
        ),
        {"assigned_to": assign_in.assigned_to, "id": issue_id},
    )
    db.commit()

    updated = db.execute(
        text("SELECT * FROM TB_QUALITY_ISSUE WHERE id = :id"), {"id": issue_id}
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"품질 이슈 {row.issue_no}에 담당자 '{assign_in.assigned_to}'가 배정되었습니다.",
        data=dict(updated._mapping),
    )
