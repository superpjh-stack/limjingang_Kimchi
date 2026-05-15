"""포장출하 공정 엔드포인트 모듈.

포장 배치 등록/조회/완료 처리, 출하준비 토글, 일별 통계 API를 제공합니다.
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

class PackagingBatchCreate(BaseModel):
    """포장출하 배치 생성 스키마."""

    product_code: str = Field(..., max_length=20, description="제품코드")
    product_name: str = Field(..., max_length=100, description="제품명")
    package_type: str = Field(..., description="포장 유형 (bag/container/commercial)")
    planned_qty: int = Field(..., gt=0, description="계획 수량")
    worker_name: Optional[str] = Field(None, max_length=50, description="작업자명")
    notes: Optional[str] = Field(None, description="비고")


class PackagingBatchComplete(BaseModel):
    """포장출하 완료 스키마."""

    completed_qty: int = Field(..., ge=0, description="완료 수량")
    defect_qty: int = Field(0, ge=0, description="불량 수량")
    notes: Optional[str] = Field(None, description="비고")


# ---------------------------------------------------------------------------
# 배치번호 자동 채번
# ---------------------------------------------------------------------------

def _generate_batch_no(db: Session, prefix: str, table: str, col: str) -> str:
    """PKG-YYYYMMDD-NNN 형태의 배치번호를 자동 채번합니다."""
    today = date.today().strftime("%Y%m%d")
    pattern = f"{prefix}-{today}-%"
    row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM {table} WHERE {col} LIKE :pattern"),
        {"pattern": pattern},
    ).fetchone()
    seq = (row.cnt if row else 0) + 1
    return f"{prefix}-{today}-{seq:03d}"


# ---------------------------------------------------------------------------
# 내부 헬퍼: 배치 조회 및 상태 업데이트
# ---------------------------------------------------------------------------

def _get_batch_or_404(db: Session, batch_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM TB_PACKAGING_BATCH WHERE id = :id AND is_deleted = 0"),
        {"id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="포장출하 배치를 찾을 수 없습니다.")
    return row


def _update_batch_fields(
    db: Session,
    batch_id: int,
    updated_by: str,
    fields: Dict[str, Any],
) -> None:
    set_parts = ["updated_by = :updated_by"]
    params: Dict[str, Any] = {"updated_by": updated_by, "id": batch_id}
    for k, v in fields.items():
        set_parts.append(f"{k} = :{k}")
        params[k] = v
    db.execute(
        text(f"UPDATE TB_PACKAGING_BATCH SET {', '.join(set_parts)} WHERE id = :id"),
        params,
    )
    db.commit()


# ---------------------------------------------------------------------------
# 1. 포장출하 배치 목록
# ---------------------------------------------------------------------------

@router.get(
    "/batches",
    response_model=APIResponse,
    summary="포장출하 배치 목록 조회",
)
def list_packaging_batches(
    date: Optional[str] = Query(None, description="날짜 필터 (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="상태 필터 (WAITING/IN_PROGRESS/COMPLETED/ON_HOLD)"),
    package_type: Optional[str] = Query(None, description="포장 유형 필터 (bag/container/commercial)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """포장출하 배치 목록을 필터 조건으로 조회합니다."""
    where_clauses = ["is_deleted = 0"]
    params: Dict[str, Any] = {}

    if date:
        where_clauses.append("DATE(created_at) = :date")
        params["date"] = date
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if package_type:
        where_clauses.append("package_type = :package_type")
        params["package_type"] = package_type

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_PACKAGING_BATCH WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_PACKAGING_BATCH WHERE {where_sql} "
            "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="포장출하 배치 목록 조회 성공", data=data, total=total)


# ---------------------------------------------------------------------------
# 2. 포장출하 배치 등록
# ---------------------------------------------------------------------------

@router.post(
    "/batches",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="포장출하 배치 등록",
)
def create_packaging_batch(
    batch_in: PackagingBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """포장출하 배치를 등록합니다. batch_no는 PKG-YYYYMMDD-NNN 형태로 자동 채번됩니다."""
    allowed_types = ("bag", "container", "commercial")
    if batch_in.package_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"package_type은 {allowed_types} 중 하나여야 합니다.",
        )

    batch_no = _generate_batch_no(db, "PKG", "TB_PACKAGING_BATCH", "batch_no")

    db.execute(
        text(
            """
            INSERT INTO TB_PACKAGING_BATCH
              (batch_no, product_code, product_name, package_type, planned_qty,
               worker_name, notes, created_by, updated_by)
            VALUES
              (:batch_no, :product_code, :product_name, :package_type, :planned_qty,
               :worker_name, :notes, :created_by, :updated_by)
            """
        ),
        {
            "batch_no": batch_no,
            "product_code": batch_in.product_code,
            "product_name": batch_in.product_name,
            "package_type": batch_in.package_type,
            "planned_qty": batch_in.planned_qty,
            "worker_name": batch_in.worker_name,
            "notes": batch_in.notes,
            "created_by": current_user.username,
            "updated_by": current_user.username,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_PACKAGING_BATCH WHERE batch_no = :batch_no"),
        {"batch_no": batch_no},
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"포장출하 배치 {batch_no}이 등록되었습니다.",
        data=dict(row._mapping),
    )


# ---------------------------------------------------------------------------
# 3. 포장출하 배치 상세
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}",
    response_model=APIResponse,
    summary="포장출하 배치 상세 조회",
)
def get_packaging_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """포장출하 배치 상세 정보를 조회합니다."""
    row = _get_batch_or_404(db, batch_id)
    return APIResponse(success=True, message="포장출하 배치 조회 성공", data=dict(row._mapping))


# ---------------------------------------------------------------------------
# 4. 포장출하 완료 (불량률 자동계산)
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/complete",
    response_model=APIResponse,
    summary="포장출하 완료 처리 (completed_qty, defect_qty → defect_rate 자동계산)",
)
def complete_packaging_batch(
    batch_id: int,
    complete_in: PackagingBatchComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """포장출하를 완료합니다. defect_rate는 (defect_qty / completed_qty) * 100 으로 자동계산됩니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="이미 완료된 배치입니다.")

    if complete_in.defect_qty > complete_in.completed_qty:
        raise HTTPException(
            status_code=400,
            detail="불량 수량은 완료 수량보다 클 수 없습니다.",
        )

    # 불량률 자동 계산
    if complete_in.completed_qty > 0:
        defect_rate = round((complete_in.defect_qty / complete_in.completed_qty) * 100, 2)
    else:
        defect_rate = 0.0

    fields: Dict[str, Any] = {
        "status": "COMPLETED",
        "completed_qty": complete_in.completed_qty,
        "defect_qty": complete_in.defect_qty,
        "defect_rate": defect_rate,
        "end_time": datetime.now(),
    }
    if complete_in.notes is not None:
        fields["notes"] = complete_in.notes

    _update_batch_fields(db, batch_id, current_user.username, fields)
    updated = db.execute(
        text("SELECT * FROM TB_PACKAGING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"포장출하 배치 {row.batch_no} 작업이 완료되었습니다. 불량률: {defect_rate}%",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 5. 출하준비 토글 (ready_to_ship)
# ---------------------------------------------------------------------------

@router.patch(
    "/batches/{batch_id}/ready",
    response_model=APIResponse,
    summary="출하준비 여부 토글 (ready_to_ship)",
)
def toggle_ready_to_ship(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """포장출하 배치의 출하준비 여부를 토글합니다. COMPLETED 상태에서만 가능합니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail=f"COMPLETED 상태의 배치만 출하준비 처리할 수 있습니다. 현재 상태: {row.status}",
        )

    new_ready = not bool(row.ready_to_ship)
    _update_batch_fields(db, batch_id, current_user.username, {"ready_to_ship": new_ready})
    updated = db.execute(
        text("SELECT * FROM TB_PACKAGING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    action_msg = "출하준비 완료" if new_ready else "출하준비 취소"
    return APIResponse(
        success=True,
        message=f"포장출하 배치 {row.batch_no} {action_msg}로 변경되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 6. 오늘 통계 (KPI)
# ---------------------------------------------------------------------------

@router.get(
    "/stats/today",
    response_model=APIResponse,
    summary="오늘 포장출하 KPI 통계",
)
def get_today_packaging_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """오늘의 포장출하 KPI를 조회합니다 (완료율, 불량률, 출하준비율)."""
    row = db.execute(
        text(
            """
            SELECT
                COUNT(*)                                                        AS total_batches,
                SUM(CASE WHEN status = 'COMPLETED'   THEN 1 ELSE 0 END)        AS completed_count,
                SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END)        AS in_progress_count,
                SUM(CASE WHEN status = 'ON_HOLD'     THEN 1 ELSE 0 END)        AS on_hold_count,
                SUM(CASE WHEN ready_to_ship = 1      THEN 1 ELSE 0 END)        AS ready_to_ship_count,
                ROUND(
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0) * 100, 2
                )                                                               AS completion_rate,
                ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN defect_rate END), 2)
                                                                                AS avg_defect_rate,
                ROUND(
                    SUM(CASE WHEN ready_to_ship = 1 THEN 1 ELSE 0 END)
                    / NULLIF(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) * 100, 2
                )                                                               AS ready_to_ship_rate,
                COALESCE(SUM(completed_qty), 0)                                AS total_completed_qty,
                COALESCE(SUM(defect_qty), 0)                                   AS total_defect_qty
            FROM TB_PACKAGING_BATCH
            WHERE is_deleted = 0
              AND DATE(created_at) = CURDATE()
            """
        )
    ).fetchone()

    data = dict(row._mapping) if row else {}
    return APIResponse(success=True, message="오늘 포장출하 KPI 조회 성공", data=data)
