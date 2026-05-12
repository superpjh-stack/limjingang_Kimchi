"""냉장창고 모니터링 엔드포인트 — Sprint 4 숙성냉장관리."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.crud.cold_storage import cold_storage
from app.schemas.cold_storage import SensorDataWrite, WarehouseStatus

router = APIRouter()


@router.get(
    "/status",
    response_model=list[WarehouseStatus],
    summary="전체 창고 현재 상태 조회",
    description="4개 창고(COLD_01~03, FREEZE_01)의 최신 온도·습도·알람 상태를 반환합니다.",
)
def get_status() -> list[WarehouseStatus]:
    return cold_storage.get_current_status()


@router.get(
    "/{warehouse_code}/trend",
    summary="창고 온도 추이 조회",
    description="선택한 창고의 기간별 온도·습도 시계열 데이터를 반환합니다.",
)
def get_trend(
    warehouse_code: str,
    period: str = Query(
        default="24h",
        description="조회 기간 (1h / 6h / 24h / 7d)",
        pattern="^(1h|6h|24h|7d)$",
    ),
) -> dict:
    allowed = {"COLD_01", "COLD_02", "COLD_03", "FREEZE_01"}
    if warehouse_code not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"warehouse_code는 {allowed} 중 하나여야 합니다.",
        )

    data = cold_storage.get_temperature_trend(warehouse_code, period)
    return {
        "warehouse_code": warehouse_code,
        "period": period,
        "data": data,
    }


@router.get(
    "/alarms",
    summary="최근 알람 이력 조회",
    description="cold_storage_alarm measurement에서 최근 알람 이력을 반환합니다.",
)
def get_alarms(
    warehouse_code: Optional[str] = Query(
        default=None, description="특정 창고 필터 (미입력 시 전체)"
    ),
    hours: int = Query(default=24, ge=1, le=168, description="조회 시간 범위(시간)"),
) -> list[dict]:
    return cold_storage.get_alarm_history(warehouse_code=warehouse_code, hours=hours)


@router.post(
    "/sensor-data",
    summary="센서 데이터 수기 입력",
    description="테스트 또는 수동 입력용 — 센서 측정값을 InfluxDB에 기록합니다.",
    status_code=status.HTTP_201_CREATED,
)
def write_sensor_data(data: SensorDataWrite) -> dict:
    success = cold_storage.write_sensor_data(data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="InfluxDB 기록에 실패했습니다. 연결 상태를 확인하세요.",
        )
    return {"success": True, "message": "센서 데이터가 기록되었습니다."}


@router.post(
    "/simulate",
    summary="더미 데이터 생성 (개발 전용)",
    description="DEBUG 모드에서만 허용됩니다. 각 창고의 랜덤 온도·습도 더미 데이터를 생성합니다.",
    status_code=status.HTTP_201_CREATED,
)
def simulate() -> dict:
    # DEBUG 환경에서만 허용
    if not getattr(settings, "DEBUG", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 엔드포인트는 DEBUG 모드에서만 사용할 수 있습니다.",
        )
    results = cold_storage.simulate_sensor_data()
    return {
        "success": True,
        "message": "더미 데이터가 생성되었습니다.",
        "records": results,
    }
