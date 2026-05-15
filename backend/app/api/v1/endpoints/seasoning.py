"""양념버무림 공정 엔드포인트 모듈.

양념버무림 배치 등록/조회/상태전환, 일별 통계 API를 제공합니다.
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

class SeasoningBatchCreate(BaseModel):
    """양념버무림 배치 생성 스키마."""

    product_code: str = Field(..., max_length=20, description="제품코드")
    product_name: str = Field(..., max_length=100, description="제품명")
    planned_qty: float = Field(..., gt=0, description="계획량 kg")
    recipe_code: Optional[str] = Field(None, max_length=30, description="레시피 코드")
    worker_name: Optional[str] = Field(None, max_length=50, description="작업자명")
    notes: Optional[str] = Field(None, description="비고")


class SeasoningBatchComplete(BaseModel):
    """양념버무림 완료 스키마."""

    actual_qty: float = Field(..., gt=0, description="실적량 kg")
    recipe_compliance: float = Field(..., ge=0, le=100, description="레시피 준수율 %")
    room_temp: Optional[float] = Field(None, description="버무림실 온도 (CCP3)")
    ccp3_pass: Optional[bool] = Field(True, description="CCP3 합격여부")
    notes: Optional[str] = Field(None, description="비고")


# ---------------------------------------------------------------------------
# 배치번호 자동 채번
# ---------------------------------------------------------------------------

def _generate_batch_no(db: Session, prefix: str, table: str, col: str) -> str:
    """MIX-YYYYMMDD-NNN 형태의 배치번호를 자동 채번합니다."""
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
        text("SELECT * FROM TB_SEASONING_BATCH WHERE id = :id AND is_deleted = 0"),
        {"id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="양념버무림 배치를 찾을 수 없습니다.")
    return row


def _update_batch_status(
    db: Session,
    batch_id: int,
    new_status: str,
    updated_by: str,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    set_parts = ["status = :status", "updated_by = :updated_by"]
    params: Dict[str, Any] = {"status": new_status, "updated_by": updated_by, "id": batch_id}
    if extra:
        for k, v in extra.items():
            set_parts.append(f"{k} = :{k}")
            params[k] = v
    db.execute(
        text(f"UPDATE TB_SEASONING_BATCH SET {', '.join(set_parts)} WHERE id = :id"),
        params,
    )
    db.commit()


# ---------------------------------------------------------------------------
# 1. 양념버무림 배치 목록
# ---------------------------------------------------------------------------

@router.get(
    "/batches",
    response_model=APIResponse,
    summary="양념버무림 배치 목록 조회",
)
def list_seasoning_batches(
    date: Optional[str] = Query(None, description="날짜 필터 (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="상태 필터 (WAITING/IN_PROGRESS/COMPLETED/ON_HOLD)"),
    product_code: Optional[str] = Query(None, description="제품코드 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """양념버무림 배치 목록을 필터 조건으로 조회합니다."""
    where_clauses = ["is_deleted = 0"]
    params: Dict[str, Any] = {}

    if date:
        where_clauses.append("DATE(created_at) = :date")
        params["date"] = date
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if product_code:
        where_clauses.append("product_code = :product_code")
        params["product_code"] = product_code

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_SEASONING_BATCH WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_SEASONING_BATCH WHERE {where_sql} "
            "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="양념버무림 배치 목록 조회 성공", data=data, total=total)


# ---------------------------------------------------------------------------
# 2. 양념버무림 배치 등록
# ---------------------------------------------------------------------------

@router.post(
    "/batches",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="양념버무림 배치 등록",
)
def create_seasoning_batch(
    batch_in: SeasoningBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """양념버무림 배치를 등록합니다. batch_no는 MIX-YYYYMMDD-NNN 형태로 자동 채번됩니다."""
    batch_no = _generate_batch_no(db, "MIX", "TB_SEASONING_BATCH", "batch_no")

    db.execute(
        text(
            """
            INSERT INTO TB_SEASONING_BATCH
              (batch_no, product_code, product_name, planned_qty,
               recipe_code, worker_name, notes, created_by, updated_by)
            VALUES
              (:batch_no, :product_code, :product_name, :planned_qty,
               :recipe_code, :worker_name, :notes, :created_by, :updated_by)
            """
        ),
        {
            "batch_no": batch_no,
            "product_code": batch_in.product_code,
            "product_name": batch_in.product_name,
            "planned_qty": batch_in.planned_qty,
            "recipe_code": batch_in.recipe_code,
            "worker_name": batch_in.worker_name,
            "notes": batch_in.notes,
            "created_by": current_user.username,
            "updated_by": current_user.username,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_SEASONING_BATCH WHERE batch_no = :batch_no"),
        {"batch_no": batch_no},
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"양념버무림 배치 {batch_no}이 등록되었습니다.",
        data=dict(row._mapping),
    )


# ---------------------------------------------------------------------------
# 3. 양념버무림 배치 상세
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}",
    response_model=APIResponse,
    summary="양념버무림 배치 상세 조회",
)
def get_seasoning_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """양념버무림 배치 상세 정보를 조회합니다."""
    row = _get_batch_or_404(db, batch_id)
    return APIResponse(success=True, message="양념버무림 배치 조회 성공", data=dict(row._mapping))


# ---------------------------------------------------------------------------
# 4. 양념버무림 시작
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/start",
    response_model=APIResponse,
    summary="양념버무림 시작 (WAITING → IN_PROGRESS)",
)
def start_seasoning_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """양념버무림을 시작합니다. WAITING 상태에서만 가능합니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status != "WAITING":
        raise HTTPException(
            status_code=400,
            detail=f"WAITING 상태의 배치만 시작할 수 있습니다. 현재 상태: {row.status}",
        )
    _update_batch_status(
        db, batch_id, "IN_PROGRESS", current_user.username,
        extra={"start_time": datetime.now()},
    )
    updated = db.execute(
        text("SELECT * FROM TB_SEASONING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"양념버무림 배치 {row.batch_no} 작업이 시작되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 5. 양념버무림 완료
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/complete",
    response_model=APIResponse,
    summary="양념버무림 완료 (IN_PROGRESS → COMPLETED)",
)
def complete_seasoning_batch(
    batch_id: int,
    complete_in: SeasoningBatchComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """양념버무림을 완료합니다. IN_PROGRESS 상태에서만 가능하며 actual_qty, recipe_compliance 필수입니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=400,
            detail=f"IN_PROGRESS 상태의 배치만 완료 처리할 수 있습니다. 현재 상태: {row.status}",
        )

    extra: Dict[str, Any] = {
        "actual_qty": complete_in.actual_qty,
        "recipe_compliance": complete_in.recipe_compliance,
        "end_time": datetime.now(),
    }
    if complete_in.room_temp is not None:
        extra["room_temp"] = complete_in.room_temp
    if complete_in.ccp3_pass is not None:
        extra["ccp3_pass"] = complete_in.ccp3_pass
    if complete_in.notes is not None:
        extra["notes"] = complete_in.notes

    _update_batch_status(db, batch_id, "COMPLETED", current_user.username, extra=extra)
    updated = db.execute(
        text("SELECT * FROM TB_SEASONING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"양념버무림 배치 {row.batch_no} 작업이 완료되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 6. 오늘 통계 (KPI)
# ---------------------------------------------------------------------------

@router.get(
    "/stats/today",
    response_model=APIResponse,
    summary="오늘 양념버무림 KPI 통계",
)
def get_today_seasoning_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """오늘의 양념버무림 KPI를 조회합니다 (진행중, 완료, 평균준수율, 총투입량)."""
    row = db.execute(
        text(
            """
            SELECT
                COUNT(*)                                                    AS total_batches,
                SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END)    AS in_progress_count,
                SUM(CASE WHEN status = 'COMPLETED'   THEN 1 ELSE 0 END)    AS completed_count,
                SUM(CASE WHEN status = 'ON_HOLD'     THEN 1 ELSE 0 END)    AS on_hold_count,
                ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN recipe_compliance END), 2)
                                                                            AS avg_recipe_compliance,
                ROUND(SUM(COALESCE(actual_qty, planned_qty)), 2)            AS total_input_qty
            FROM TB_SEASONING_BATCH
            WHERE is_deleted = 0
              AND DATE(created_at) = CURDATE()
            """
        )
    ).fetchone()

    data = dict(row._mapping) if row else {}
    return APIResponse(success=True, message="오늘 양념버무림 KPI 조회 성공", data=data)
