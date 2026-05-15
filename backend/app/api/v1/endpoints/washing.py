"""세척공정 엔드포인트 모듈.

세척 배치 등록/조회/상태전환, 이물질 검출 기록, 세척 기준 마스터 조회,
일별 통계 API를 제공합니다.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
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

class WashingBatchCreate(BaseModel):
    """세척 배치 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    lot_no: str = Field(..., max_length=30, description="LOT 번호")
    material_type: str = Field(
        ..., description="원재료 유형 (CABBAGE/RADISH/GREEN_ONION/MUSTARD_GREEN/OTHER)"
    )
    input_weight_kg: float = Field(..., gt=0, description="투입 중량(kg)")
    water_temp_c: float = Field(..., description="세척수 온도(°C)")
    wash_count: int = Field(0, ge=0, description="세척 횟수")
    wash_duration_min: Optional[int] = Field(None, ge=0, description="세척 소요시간(분)")
    remarks: Optional[str] = Field(None, description="비고")


class WashingBatchComplete(BaseModel):
    """세척 완료 스키마."""

    quality_grade: str = Field(..., description="품질 등급 (A/B/C)")
    wash_count: Optional[int] = Field(None, ge=0, description="최종 세척 횟수")
    wash_duration_min: Optional[int] = Field(None, ge=0, description="총 소요시간(분)")
    remarks: Optional[str] = Field(None, description="비고")


class WashingBatchHold(BaseModel):
    """보류 처리 스키마."""

    remarks: str = Field(..., description="보류 사유")


class ForeignMatterCreate(BaseModel):
    """이물질 검출 등록 스키마."""

    matter_type: str = Field(..., description="이물질 유형 (STONE/SOIL/INSECT/METAL/OTHER)")
    detection_point: str = Field(..., max_length=100, description="검출 지점")
    description: Optional[str] = Field(None, description="상세 내용")
    action_taken: Optional[str] = Field(None, description="조치 (RE_WASH/DISCARD/ON_HOLD)")
    action_memo: Optional[str] = Field(None, description="조치 메모")


# ---------------------------------------------------------------------------
# 배치번호 자동 채번
# ---------------------------------------------------------------------------

def _generate_batch_no(db: Session, prefix: str, table: str, col: str) -> str:
    """WASH-YYYYMMDD-NNN 형태의 배치번호를 자동 채번합니다."""
    today = date.today().strftime("%Y%m%d")
    pattern = f"{prefix}-{today}-%"
    row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM {table} WHERE {col} LIKE :pattern"),
        {"pattern": pattern},
    ).fetchone()
    seq = (row.cnt if row else 0) + 1
    return f"{prefix}-{today}-{seq:03d}"


# ---------------------------------------------------------------------------
# 1. 세척 배치 목록
# ---------------------------------------------------------------------------

@router.get(
    "/batches",
    response_model=APIResponse,
    summary="세척 배치 목록 조회",
)
def list_washing_batches(
    date_from: Optional[date] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="종료일 (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="상태 필터"),
    material_type: Optional[str] = Query(None, description="원재료 유형 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척 배치 목록을 필터 조건으로 조회합니다."""
    where_clauses = ["is_deleted = 0"]
    params: Dict[str, Any] = {}

    if date_from:
        where_clauses.append("DATE(created_at) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("DATE(created_at) <= :date_to")
        params["date_to"] = date_to
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if material_type:
        where_clauses.append("material_type = :material_type")
        params["material_type"] = material_type

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_WASHING_BATCH WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_WASHING_BATCH WHERE {where_sql} "
            "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="세척 배치 목록 조회 성공", data=data, total=total)


# ---------------------------------------------------------------------------
# 2. 세척 배치 등록
# ---------------------------------------------------------------------------

@router.post(
    "/batches",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="세척 배치 등록",
)
def create_washing_batch(
    batch_in: WashingBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척 배치를 등록합니다. batch_no는 WASH-YYYYMMDD-NNN 형태로 자동 채번됩니다."""
    batch_no = _generate_batch_no(db, "WASH", "TB_WASHING_BATCH", "batch_no")

    db.execute(
        text(
            """
            INSERT INTO TB_WASHING_BATCH
              (batch_no, work_order_id, lot_no, material_type, input_weight_kg,
               water_temp_c, wash_count, wash_duration_min, remarks, created_by)
            VALUES
              (:batch_no, :work_order_id, :lot_no, :material_type, :input_weight_kg,
               :water_temp_c, :wash_count, :wash_duration_min, :remarks, :created_by)
            """
        ),
        {
            "batch_no": batch_no,
            "work_order_id": batch_in.work_order_id,
            "lot_no": batch_in.lot_no,
            "material_type": batch_in.material_type,
            "input_weight_kg": batch_in.input_weight_kg,
            "water_temp_c": batch_in.water_temp_c,
            "wash_count": batch_in.wash_count,
            "wash_duration_min": batch_in.wash_duration_min,
            "remarks": batch_in.remarks,
            "created_by": current_user.username,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_WASHING_BATCH WHERE batch_no = :batch_no"),
        {"batch_no": batch_no},
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"세척 배치 {batch_no}이 등록되었습니다.",
        data=dict(row._mapping),
    )


# ---------------------------------------------------------------------------
# 3. 세척 배치 상세
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}",
    response_model=APIResponse,
    summary="세척 배치 상세 조회",
)
def get_washing_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척 배치 상세 정보를 조회합니다."""
    row = db.execute(
        text("SELECT * FROM TB_WASHING_BATCH WHERE id = :id AND is_deleted = 0"),
        {"id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="세척 배치를 찾을 수 없습니다.")
    return APIResponse(success=True, message="세척 배치 조회 성공", data=dict(row._mapping))


# ---------------------------------------------------------------------------
# 내부 헬퍼: 배치 조회 및 상태 검증
# ---------------------------------------------------------------------------

def _get_batch_or_404(db: Session, batch_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM TB_WASHING_BATCH WHERE id = :id AND is_deleted = 0"),
        {"id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="세척 배치를 찾을 수 없습니다.")
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
        text(f"UPDATE TB_WASHING_BATCH SET {', '.join(set_parts)} WHERE id = :id"),
        params,
    )
    db.commit()


# ---------------------------------------------------------------------------
# 4. 세척 시작
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/start",
    response_model=APIResponse,
    summary="세척 시작 (WAITING → IN_PROGRESS)",
)
def start_washing_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척을 시작합니다. WAITING 상태에서만 가능합니다."""
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
        text("SELECT * FROM TB_WASHING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"세척 배치 {row.batch_no} 세척이 시작되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 5. 세척 완료
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/complete",
    response_model=APIResponse,
    summary="세척 완료 (IN_PROGRESS → COMPLETED)",
)
def complete_washing_batch(
    batch_id: int,
    complete_in: WashingBatchComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척을 완료합니다. IN_PROGRESS 상태에서만 가능하며 quality_grade 필수입니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=400,
            detail=f"IN_PROGRESS 상태의 배치만 완료 처리할 수 있습니다. 현재 상태: {row.status}",
        )
    if complete_in.quality_grade not in ("A", "B", "C"):
        raise HTTPException(status_code=400, detail="quality_grade는 A, B, C 중 하나여야 합니다.")

    extra: Dict[str, Any] = {
        "quality_grade": complete_in.quality_grade,
        "end_time": datetime.now(),
    }
    if complete_in.wash_count is not None:
        extra["wash_count"] = complete_in.wash_count
    if complete_in.wash_duration_min is not None:
        extra["wash_duration_min"] = complete_in.wash_duration_min
    if complete_in.remarks is not None:
        extra["remarks"] = complete_in.remarks

    _update_batch_status(db, batch_id, "COMPLETED", current_user.username, extra=extra)
    updated = db.execute(
        text("SELECT * FROM TB_WASHING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"세척 배치 {row.batch_no} 세척이 완료되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 6. 보류 처리
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/hold",
    response_model=APIResponse,
    summary="보류 처리 (→ ON_HOLD)",
)
def hold_washing_batch(
    batch_id: int,
    hold_in: WashingBatchHold,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척 배치를 보류 상태로 전환합니다."""
    row = _get_batch_or_404(db, batch_id)
    if row.status in ("COMPLETED", "DISCARDED"):
        raise HTTPException(
            status_code=400,
            detail=f"COMPLETED 또는 DISCARDED 상태에서는 보류 처리할 수 없습니다. 현재 상태: {row.status}",
        )
    _update_batch_status(
        db, batch_id, "ON_HOLD", current_user.username,
        extra={"remarks": hold_in.remarks},
    )
    updated = db.execute(
        text("SELECT * FROM TB_WASHING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()
    return APIResponse(
        success=True,
        message=f"세척 배치 {row.batch_no}이 보류 처리되었습니다.",
        data=dict(updated._mapping),
    )


# ---------------------------------------------------------------------------
# 7. 이물질 검출 등록 (자동 ON_HOLD 전환)
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/foreign-matter",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="이물질 검출 등록",
)
def create_foreign_matter(
    batch_id: int,
    fm_in: ForeignMatterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """이물질 검출을 등록하고 배치를 자동으로 ON_HOLD 상태로 전환합니다."""
    _get_batch_or_404(db, batch_id)

    db.execute(
        text(
            """
            INSERT INTO TB_FOREIGN_MATTER_LOG
              (batch_id, matter_type, detection_point, description,
               action_taken, action_memo, reported_by)
            VALUES
              (:batch_id, :matter_type, :detection_point, :description,
               :action_taken, :action_memo, :reported_by)
            """
        ),
        {
            "batch_id": batch_id,
            "matter_type": fm_in.matter_type,
            "detection_point": fm_in.detection_point,
            "description": fm_in.description,
            "action_taken": fm_in.action_taken,
            "action_memo": fm_in.action_memo,
            "reported_by": current_user.username,
        },
    )

    # 배치 자동 ON_HOLD 전환
    db.execute(
        text(
            "UPDATE TB_WASHING_BATCH SET status = 'ON_HOLD', updated_by = :updated_by "
            "WHERE id = :id AND status NOT IN ('COMPLETED', 'DISCARDED')"
        ),
        {"updated_by": current_user.username, "id": batch_id},
    )
    db.commit()

    log_row = db.execute(
        text("SELECT * FROM TB_FOREIGN_MATTER_LOG WHERE batch_id = :batch_id ORDER BY id DESC LIMIT 1"),
        {"batch_id": batch_id},
    ).fetchone()

    return APIResponse(
        success=True,
        message="이물질 검출이 등록되었습니다. 배치가 ON_HOLD 상태로 전환되었습니다.",
        data=dict(log_row._mapping),
    )


# ---------------------------------------------------------------------------
# 8. 이물질 검출 이력 조회
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}/foreign-matter",
    response_model=APIResponse,
    summary="이물질 검출 이력 조회",
)
def list_foreign_matter(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """세척 배치의 이물질 검출 이력을 조회합니다."""
    _get_batch_or_404(db, batch_id)
    rows = db.execute(
        text(
            "SELECT * FROM TB_FOREIGN_MATTER_LOG WHERE batch_id = :batch_id ORDER BY reported_at ASC"
        ),
        {"batch_id": batch_id},
    ).fetchall()
    data = [dict(r._mapping) for r in rows]
    return APIResponse(
        success=True,
        message="이물질 검출 이력 조회 성공",
        data=data,
        total=len(data),
    )


# ---------------------------------------------------------------------------
# 9. 세척 기준 마스터 조회
# ---------------------------------------------------------------------------

@router.get(
    "/standards",
    response_model=APIResponse,
    summary="세척 기준 마스터 조회",
)
def list_washing_standards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """원재료별 세척 기준(HACCP CCP)을 조회합니다."""
    rows = db.execute(
        text("SELECT * FROM TB_WASHING_STANDARD WHERE is_active = 1 ORDER BY id")
    ).fetchall()
    data = [dict(r._mapping) for r in rows]
    return APIResponse(
        success=True,
        message="세척 기준 조회 성공",
        data=data,
        total=len(data),
    )


# ---------------------------------------------------------------------------
# 10. 일별 세척량 통계
# ---------------------------------------------------------------------------

@router.get(
    "/stats/daily",
    response_model=APIResponse,
    summary="일별 세척량 통계",
)
def get_daily_washing_stats(
    date_from: date = Query(..., description="시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """일별 세척 배치 수, 투입 중량 합계, 완료/보류 건수를 조회합니다."""
    rows = db.execute(
        text(
            """
            SELECT
                DATE(created_at)                          AS stat_date,
                COUNT(*)                                  AS total_batches,
                SUM(input_weight_kg)                      AS total_input_kg,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN status = 'ON_HOLD'   THEN 1 ELSE 0 END) AS on_hold_count,
                SUM(CASE WHEN status = 'DISCARDED' THEN 1 ELSE 0 END) AS discarded_count
            FROM TB_WASHING_BATCH
            WHERE is_deleted = 0
              AND DATE(created_at) BETWEEN :date_from AND :date_to
            GROUP BY DATE(created_at)
            ORDER BY stat_date
            """
        ),
        {"date_from": date_from, "date_to": date_to},
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(
        success=True,
        message="일별 세척량 통계 조회 성공",
        data=data,
        total=len(data),
    )
