"""절임공정 엔드포인트 모듈.

절임 배치 등록/조회/완료, 농도 측정 기록, 일별 통계 API를 제공합니다.
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

class SaltingBatchCreate(BaseModel):
    """절임 배치 생성 스키마."""

    work_order_id: int = Field(..., description="작업지시 ID")
    lot_no: str = Field(..., max_length=30, description="LOT 번호")
    material_type: str = Field(
        ..., description="원재료 유형 (CABBAGE/RADISH/GREEN_ONION/MUSTARD_GREEN/OTHER)"
    )
    input_weight_kg: float = Field(..., gt=0, description="투입 중량(kg)")
    brine_concentration: float = Field(..., gt=0, le=100, description="염수농도(%)")
    start_time: datetime = Field(..., description="절임 시작일시")
    rinse_count: int = Field(3, ge=0, description="헹굼 횟수")
    remarks: Optional[str] = Field(None, description="비고")


class SaltingBatchComplete(BaseModel):
    """절임 완료 스키마."""

    end_time: datetime = Field(..., description="절임 종료일시")
    salinity_after: float = Field(..., ge=0, le=100, description="절임 후 염도(%)")
    output_weight_kg: float = Field(..., gt=0, description="산출 중량(kg)")
    remarks: Optional[str] = Field(None, description="비고")


class ConcentrationLogCreate(BaseModel):
    """농도 측정 기록 스키마."""

    measured_at: Optional[datetime] = Field(None, description="측정일시 (기본값: 현재)")
    concentration: float = Field(..., ge=0, le=100, description="농도(%)")
    temperature: Optional[float] = Field(None, description="온도(°C)")
    ph: Optional[float] = Field(None, ge=0, le=14, description="pH")
    corrective_action: Optional[str] = Field(None, description="CCP 이탈 시 조치내용")


# ---------------------------------------------------------------------------
# 배치번호 자동 채번
# ---------------------------------------------------------------------------

def _generate_salt_batch_no(db: Session) -> str:
    """SALT-YYYYMMDD-NNN 형태의 배치번호를 자동 채번합니다."""
    today = date.today().strftime("%Y%m%d")
    pattern = f"SALT-{today}-%"
    row = db.execute(
        text("SELECT COUNT(*) AS cnt FROM TB_SALTING_BATCH WHERE batch_no LIKE :pattern"),
        {"pattern": pattern},
    ).fetchone()
    seq = (row.cnt if row else 0) + 1
    return f"SALT-{today}-{seq:03d}"


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

def _get_salting_batch_or_404(db: Session, batch_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM TB_SALTING_BATCH WHERE id = :id AND is_deleted = 0"),
        {"id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="절임 배치를 찾을 수 없습니다.")
    return row


# ---------------------------------------------------------------------------
# 1. 절임 배치 목록
# ---------------------------------------------------------------------------

@router.get(
    "/batches",
    response_model=APIResponse,
    summary="절임 배치 목록 조회",
)
def list_salting_batches(
    date_from: Optional[date] = Query(None, description="시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="종료일 (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="상태 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임 배치 목록을 필터 조건으로 조회합니다."""
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

    where_sql = " AND ".join(where_clauses)

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM TB_SALTING_BATCH WHERE {where_sql}"),
        params,
    ).fetchone()
    total = total_row.cnt if total_row else 0

    params["limit"] = limit
    params["offset"] = skip
    rows = db.execute(
        text(
            f"SELECT * FROM TB_SALTING_BATCH WHERE {where_sql} "
            "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    data = [dict(r._mapping) for r in rows]
    return APIResponse(success=True, message="절임 배치 목록 조회 성공", data=data, total=total)


# ---------------------------------------------------------------------------
# 2. 절임 배치 등록
# ---------------------------------------------------------------------------

@router.post(
    "/batches",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="절임 배치 등록",
)
def create_salting_batch(
    batch_in: SaltingBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임 배치를 등록합니다. batch_no는 SALT-YYYYMMDD-NNN 형태로 자동 채번됩니다."""
    batch_no = _generate_salt_batch_no(db)

    db.execute(
        text(
            """
            INSERT INTO TB_SALTING_BATCH
              (batch_no, work_order_id, lot_no, material_type, input_weight_kg,
               brine_concentration, start_time, rinse_count, remarks, created_by)
            VALUES
              (:batch_no, :work_order_id, :lot_no, :material_type, :input_weight_kg,
               :brine_concentration, :start_time, :rinse_count, :remarks, :created_by)
            """
        ),
        {
            "batch_no": batch_no,
            "work_order_id": batch_in.work_order_id,
            "lot_no": batch_in.lot_no,
            "material_type": batch_in.material_type,
            "input_weight_kg": batch_in.input_weight_kg,
            "brine_concentration": batch_in.brine_concentration,
            "start_time": batch_in.start_time,
            "rinse_count": batch_in.rinse_count,
            "remarks": batch_in.remarks,
            "created_by": current_user.username,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM TB_SALTING_BATCH WHERE batch_no = :batch_no"),
        {"batch_no": batch_no},
    ).fetchone()

    return APIResponse(
        success=True,
        message=f"절임 배치 {batch_no}이 등록되었습니다.",
        data=dict(row._mapping),
    )


# ---------------------------------------------------------------------------
# 3. 절임 배치 상세
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}",
    response_model=APIResponse,
    summary="절임 배치 상세 조회",
)
def get_salting_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임 배치 상세 정보를 조회합니다."""
    row = _get_salting_batch_or_404(db, batch_id)
    return APIResponse(success=True, message="절임 배치 조회 성공", data=dict(row._mapping))


# ---------------------------------------------------------------------------
# 4. 절임 완료 (ccp_pass 자동 계산)
# ---------------------------------------------------------------------------

_SALINITY_MIN = 2.0
_SALINITY_MAX = 3.0


@router.post(
    "/batches/{batch_id}/complete",
    response_model=APIResponse,
    summary="절임 완료",
)
def complete_salting_batch(
    batch_id: int,
    complete_in: SaltingBatchComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임을 완료합니다. 절임 후 염도가 기준(2.0~3.0%) 범위일 때 ccp_pass=True로 자동 설정됩니다."""
    row = _get_salting_batch_or_404(db, batch_id)
    if row.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="이미 완료된 절임 배치입니다.")

    ccp_pass = _SALINITY_MIN <= complete_in.salinity_after <= _SALINITY_MAX

    elapsed_hours: Optional[float] = None
    if complete_in.end_time and row.start_time:
        start_dt = row.start_time if isinstance(row.start_time, datetime) else datetime.fromisoformat(str(row.start_time))
        delta = complete_in.end_time - start_dt
        elapsed_hours = round(delta.total_seconds() / 3600, 2)

    db.execute(
        text(
            """
            UPDATE TB_SALTING_BATCH
            SET status = 'COMPLETED',
                end_time = :end_time,
                elapsed_hours = :elapsed_hours,
                salinity_after = :salinity_after,
                output_weight_kg = :output_weight_kg,
                ccp_pass = :ccp_pass,
                remarks = COALESCE(:remarks, remarks)
            WHERE id = :id
            """
        ),
        {
            "end_time": complete_in.end_time,
            "elapsed_hours": elapsed_hours,
            "salinity_after": complete_in.salinity_after,
            "output_weight_kg": complete_in.output_weight_kg,
            "ccp_pass": 1 if ccp_pass else 0,
            "remarks": complete_in.remarks,
            "id": batch_id,
        },
    )
    db.commit()

    updated = db.execute(
        text("SELECT * FROM TB_SALTING_BATCH WHERE id = :id"), {"id": batch_id}
    ).fetchone()

    msg = f"절임 배치 {row.batch_no} 완료. CCP {'합격' if ccp_pass else '불합격 - 조치 필요'} (염도 {complete_in.salinity_after}%)"
    return APIResponse(success=True, message=msg, data=dict(updated._mapping))


# ---------------------------------------------------------------------------
# 5. 농도 측정 기록
# ---------------------------------------------------------------------------

@router.post(
    "/batches/{batch_id}/concentration",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="농도 측정 기록",
)
def create_concentration_log(
    batch_id: int,
    log_in: ConcentrationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임 배치의 농도 측정 결과를 기록합니다. CCP 기준 이탈 시 ccp_pass=False로 자동 설정됩니다."""
    _get_salting_batch_or_404(db, batch_id)

    ccp_pass = _SALINITY_MIN <= log_in.concentration <= _SALINITY_MAX
    measured_at = log_in.measured_at or datetime.now()

    db.execute(
        text(
            """
            INSERT INTO TB_SALTING_CONCENTRATION_LOG
              (batch_id, measured_at, concentration, temperature, ph, ccp_pass,
               measured_by, corrective_action)
            VALUES
              (:batch_id, :measured_at, :concentration, :temperature, :ph, :ccp_pass,
               :measured_by, :corrective_action)
            """
        ),
        {
            "batch_id": batch_id,
            "measured_at": measured_at,
            "concentration": log_in.concentration,
            "temperature": log_in.temperature,
            "ph": log_in.ph,
            "ccp_pass": 1 if ccp_pass else 0,
            "measured_by": current_user.username,
            "corrective_action": log_in.corrective_action,
        },
    )
    db.commit()

    log_row = db.execute(
        text(
            "SELECT * FROM TB_SALTING_CONCENTRATION_LOG "
            "WHERE batch_id = :batch_id ORDER BY id DESC LIMIT 1"
        ),
        {"batch_id": batch_id},
    ).fetchone()

    msg = f"농도 측정 기록 완료. CCP {'합격' if ccp_pass else '불합격 - 조치 필요'} (농도 {log_in.concentration}%)"
    return APIResponse(success=True, message=msg, data=dict(log_row._mapping))


# ---------------------------------------------------------------------------
# 6. 농도 측정 이력 조회
# ---------------------------------------------------------------------------

@router.get(
    "/batches/{batch_id}/concentration",
    response_model=APIResponse,
    summary="농도 측정 이력 조회",
)
def list_concentration_logs(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """절임 배치의 농도 측정 이력을 시간순으로 조회합니다."""
    _get_salting_batch_or_404(db, batch_id)
    rows = db.execute(
        text(
            "SELECT * FROM TB_SALTING_CONCENTRATION_LOG "
            "WHERE batch_id = :batch_id ORDER BY measured_at ASC"
        ),
        {"batch_id": batch_id},
    ).fetchall()
    data = [dict(r._mapping) for r in rows]
    return APIResponse(
        success=True,
        message="농도 측정 이력 조회 성공",
        data=data,
        total=len(data),
    )


# ---------------------------------------------------------------------------
# 7. 일별 절임 통계
# ---------------------------------------------------------------------------

@router.get(
    "/stats/daily",
    response_model=APIResponse,
    summary="일별 절임 통계",
)
def get_daily_salting_stats(
    date_from: date = Query(..., description="시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """일별 절임 배치 수, 투입/산출 중량, CCP 합격률을 조회합니다."""
    rows = db.execute(
        text(
            """
            SELECT
                DATE(created_at)                           AS stat_date,
                COUNT(*)                                   AS total_batches,
                SUM(input_weight_kg)                       AS total_input_kg,
                SUM(output_weight_kg)                      AS total_output_kg,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN ccp_pass = 1 THEN 1 ELSE 0 END)         AS ccp_pass_count,
                AVG(brine_concentration)                   AS avg_brine_conc,
                AVG(salinity_after)                        AS avg_salinity_after
            FROM TB_SALTING_BATCH
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
        message="일별 절임 통계 조회 성공",
        data=data,
        total=len(data),
    )
