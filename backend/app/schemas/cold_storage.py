"""냉장창고 모니터링 스키마 — HACCP CCP 기준 온도/습도 관리."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class SensorDataWrite(BaseModel):
    """센서 데이터 입력 스키마."""

    warehouse_code: str  # COLD_01 / COLD_02 / COLD_03 / FREEZE_01
    sensor_type: str     # temperature / humidity
    value: float
    unit: str = "°C"
    timestamp: Optional[datetime] = None  # None이면 현재 시각 사용

    @field_validator("warehouse_code")
    @classmethod
    def validate_warehouse_code(cls, v: str) -> str:
        allowed = {"COLD_01", "COLD_02", "COLD_03", "FREEZE_01"}
        if v not in allowed:
            raise ValueError(f"warehouse_code는 {allowed} 중 하나여야 합니다.")
        return v

    @field_validator("sensor_type")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        allowed = {"temperature", "humidity"}
        if v not in allowed:
            raise ValueError(f"sensor_type은 {allowed} 중 하나여야 합니다.")
        return v


class SensorDataResponse(BaseModel):
    """센서 데이터 조회 응답 스키마."""

    warehouse_code: str
    sensor_type: str
    value: float
    unit: str
    timestamp: datetime
    is_alarm: bool = False


class WarehouseStatus(BaseModel):
    """창고 현재 상태 스키마."""

    warehouse_code: str
    warehouse_name: str
    warehouse_type: str          # COLD / FREEZE
    current_temperature: Optional[float]
    current_humidity: Optional[float]
    last_updated: Optional[datetime]
    alarm_level: Optional[str]   # None / WARNING / DANGER
    threshold_min: float
    threshold_max: float
    is_normal: bool


class TemperatureTrend(BaseModel):
    """온도 추이 데이터 스키마."""

    warehouse_code: str
    period: str                  # "1h" / "6h" / "24h" / "7d"
    data: list[dict]             # [{time, temperature, humidity}, ...]


class AlarmHistory(BaseModel):
    """알람 이력 스키마."""

    warehouse_code: str
    alarm_level: str             # WARNING / DANGER
    value: float
    threshold_min: float
    threshold_max: float
    message: str
    occurred_at: datetime
    resolved: bool = False
