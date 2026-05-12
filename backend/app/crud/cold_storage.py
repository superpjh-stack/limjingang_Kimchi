"""냉장창고 CRUD — InfluxDB 2.7 기반 센서 데이터 읽기/쓰기."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone
from typing import Optional

from influxdb_client import Point
from influxdb_client.client.exceptions import InfluxDBError

from app.core.config import settings
from app.core.influxdb import get_write_api, get_query_api
from app.schemas.cold_storage import (
    SensorDataWrite,
    WarehouseStatus,
)

logger = logging.getLogger(__name__)


class CRUDColdStorage:
    """냉장창고 센서 데이터 CRUD 클래스."""

    # HACCP CCP 기준 창고 설정
    WAREHOUSE_CONFIG: dict[str, dict] = {
        "COLD_01": {
            "name": "숙성냉장고 1호",
            "type": "COLD",
            "min_temp": -2.0,
            "max_temp": 5.0,
        },
        "COLD_02": {
            "name": "숙성냉장고 2호",
            "type": "COLD",
            "min_temp": -2.0,
            "max_temp": 5.0,
        },
        "COLD_03": {
            "name": "숙성냉장고 3호",
            "type": "COLD",
            "min_temp": -2.0,
            "max_temp": 5.0,
        },
        "FREEZE_01": {
            "name": "냉동창고",
            "type": "FREEZE",
            "min_temp": -20.0,
            "max_temp": -15.0,
        },
    }

    # 알람 판정 임계값 (기준값 ± 오프셋)
    WARNING_OFFSET = 2.0
    DANGER_OFFSET = 5.0

    # ── 내부 헬퍼 ──────────────────────────────────────────────────────────────

    def _detect_alarm_level(
        self,
        value: float,
        min_temp: float,
        max_temp: float,
        sensor_type: str,
    ) -> Optional[str]:
        """온도 값에 대한 알람 레벨을 판정합니다. 습도는 알람 미적용."""
        if sensor_type != "temperature":
            return None

        over_danger = (value > max_temp + self.DANGER_OFFSET) or (
            value < min_temp - self.DANGER_OFFSET
        )
        over_warning = (value > max_temp + self.WARNING_OFFSET) or (
            value < min_temp - self.WARNING_OFFSET
        )

        if over_danger:
            return "DANGER"
        if over_warning:
            return "WARNING"
        return None

    # ── 쓰기 ──────────────────────────────────────────────────────────────────

    def write_sensor_data(self, data: SensorDataWrite) -> bool:
        """센서 측정값을 InfluxDB에 기록합니다.

        이상 감지 시 cold_storage_alarm measurement에도 동시 기록합니다.
        InfluxDB 연결 실패 시 False를 반환하고 에러를 throw하지 않습니다.
        """
        config = self.WAREHOUSE_CONFIG.get(data.warehouse_code)
        if config is None:
            logger.warning("알 수 없는 warehouse_code: %s", data.warehouse_code)
            return False

        ts = data.timestamp or datetime.now(timezone.utc)
        alarm_level = self._detect_alarm_level(
            data.value, config["min_temp"], config["max_temp"], data.sensor_type
        )
        is_alarm = alarm_level is not None

        try:
            write_api = get_write_api()

            # 1) 측정값 기록
            point = (
                Point("cold_storage")
                .tag("warehouse_code", data.warehouse_code)
                .tag("sensor_type", data.sensor_type)
                .field("value", float(data.value))
                .field("unit", data.unit)
                .field("is_alarm", is_alarm)
                .time(ts)
            )
            write_api.write(
                bucket=settings.INFLUXDB_BUCKET,
                org=settings.INFLUXDB_ORG,
                record=point,
            )

            # 2) 알람 발생 시 별도 measurement 기록
            if is_alarm:
                alarm_msg = (
                    f"[{alarm_level}] {config['name']} 온도 이상: "
                    f"{data.value}{data.unit} "
                    f"(기준: {config['min_temp']}~{config['max_temp']}°C)"
                )
                alarm_point = (
                    Point("cold_storage_alarm")
                    .tag("warehouse_code", data.warehouse_code)
                    .tag("alarm_level", alarm_level)
                    .field("value", float(data.value))
                    .field("threshold_min", float(config["min_temp"]))
                    .field("threshold_max", float(config["max_temp"]))
                    .field("message", alarm_msg)
                    .time(ts)
                )
                write_api.write(
                    bucket=settings.INFLUXDB_BUCKET,
                    org=settings.INFLUXDB_ORG,
                    record=alarm_point,
                )

            return True

        except InfluxDBError as exc:
            logger.error("InfluxDB 쓰기 오류: %s", exc)
            return False
        except Exception as exc:  # noqa: BLE001
            logger.error("센서 데이터 기록 중 예외: %s", exc)
            return False

    # ── 조회: 현재 상태 ────────────────────────────────────────────────────────

    def get_current_status(self) -> list[WarehouseStatus]:
        """모든 창고의 최신 온도/습도를 조회합니다.

        InfluxDB 미연결 시 기준값만 포함된 기본 상태 목록을 반환합니다.
        """
        try:
            query_api = get_query_api()
            flux = f"""
from(bucket: "{settings.INFLUXDB_BUCKET}")
  |> range(start: -2h)
  |> filter(fn: (r) => r["_measurement"] == "cold_storage")
  |> filter(fn: (r) => r["_field"] == "value")
  |> last()
  |> pivot(rowKey:["_time"], columnKey: ["sensor_type"], valueColumn: "_value")
"""
            tables = query_api.query(flux, org=settings.INFLUXDB_ORG)

            # 결과를 {warehouse_code: row} 딕셔너리로 변환
            latest: dict[str, dict] = {}
            for table in tables:
                for record in table.records:
                    code = record.values.get("warehouse_code")
                    if code:
                        if code not in latest:
                            latest[code] = {"time": None, "temperature": None, "humidity": None}
                        latest[code]["time"] = record.get_time()
                        if "temperature" in record.values:
                            latest[code]["temperature"] = record.values["temperature"]
                        if "humidity" in record.values:
                            latest[code]["humidity"] = record.values["humidity"]

        except Exception as exc:  # noqa: BLE001
            logger.warning("InfluxDB 상태 조회 실패 (graceful degradation): %s", exc)
            latest = {}

        result: list[WarehouseStatus] = []
        for code, config in self.WAREHOUSE_CONFIG.items():
            row = latest.get(code, {})
            temp = row.get("temperature")
            alarm_level: Optional[str] = None

            if temp is not None:
                alarm_level = self._detect_alarm_level(
                    temp, config["min_temp"], config["max_temp"], "temperature"
                )

            result.append(
                WarehouseStatus(
                    warehouse_code=code,
                    warehouse_name=config["name"],
                    warehouse_type=config["type"],
                    current_temperature=temp,
                    current_humidity=row.get("humidity"),
                    last_updated=row.get("time"),
                    alarm_level=alarm_level,
                    threshold_min=config["min_temp"],
                    threshold_max=config["max_temp"],
                    is_normal=alarm_level is None,
                )
            )
        return result

    # ── 조회: 온도 추이 ────────────────────────────────────────────────────────

    def get_temperature_trend(
        self, warehouse_code: str, period: str = "24h"
    ) -> list[dict]:
        """기간별 온도/습도 추이 데이터를 반환합니다.

        period 별 aggregateWindow 설정:
          1h  → every: 5m
          6h  → every: 15m
          24h → every: 1h
          7d  → every: 6h
        """
        window_map = {
            "1h": "5m",
            "6h": "15m",
            "24h": "1h",
            "7d": "6h",
        }
        every = window_map.get(period, "1h")

        try:
            query_api = get_query_api()
            flux = f"""
from(bucket: "{settings.INFLUXDB_BUCKET}")
  |> range(start: -{period})
  |> filter(fn: (r) => r["_measurement"] == "cold_storage")
  |> filter(fn: (r) => r["warehouse_code"] == "{warehouse_code}")
  |> filter(fn: (r) => r["_field"] == "value")
  |> aggregateWindow(every: {every}, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["sensor_type"], valueColumn: "_value")
  |> sort(columns: ["_time"])
"""
            tables = query_api.query(flux, org=settings.INFLUXDB_ORG)

            data: list[dict] = []
            for table in tables:
                for record in table.records:
                    point: dict = {
                        "time": record.get_time().isoformat(),
                        "temperature": record.values.get("temperature"),
                        "humidity": record.values.get("humidity"),
                    }
                    data.append(point)
            return data

        except Exception as exc:  # noqa: BLE001
            logger.warning("InfluxDB 추이 조회 실패 (graceful degradation): %s", exc)
            return []

    # ── 조회: 알람 이력 ────────────────────────────────────────────────────────

    def get_alarm_history(
        self, warehouse_code: Optional[str] = None, hours: int = 24
    ) -> list[dict]:
        """cold_storage_alarm measurement에서 알람 이력을 조회합니다."""
        warehouse_filter = ""
        if warehouse_code:
            warehouse_filter = (
                f'|> filter(fn: (r) => r["warehouse_code"] == "{warehouse_code}")'
            )

        try:
            query_api = get_query_api()
            flux = f"""
from(bucket: "{settings.INFLUXDB_BUCKET}")
  |> range(start: -{hours}h)
  |> filter(fn: (r) => r["_measurement"] == "cold_storage_alarm")
  {warehouse_filter}
  |> pivot(rowKey:["_time","warehouse_code","alarm_level"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
"""
            tables = query_api.query(flux, org=settings.INFLUXDB_ORG)

            alarms: list[dict] = []
            for table in tables:
                for record in table.records:
                    alarms.append(
                        {
                            "warehouse_code": record.values.get("warehouse_code"),
                            "alarm_level": record.values.get("alarm_level"),
                            "value": record.values.get("value"),
                            "threshold_min": record.values.get("threshold_min"),
                            "threshold_max": record.values.get("threshold_max"),
                            "message": record.values.get("message", ""),
                            "occurred_at": record.get_time().isoformat(),
                        }
                    )
            return alarms

        except Exception as exc:  # noqa: BLE001
            logger.warning("InfluxDB 알람 이력 조회 실패 (graceful degradation): %s", exc)
            return []

    # ── 개발용: 더미 데이터 생성 ────────────────────────────────────────────────

    def simulate_sensor_data(self) -> dict[str, int]:
        """개발용 더미 센서 데이터를 생성하여 기록합니다.

        COLD 창고: -1~4°C (온도), 85~95% (습도)
        FREEZE 창고: -18~-16°C (온도), 70~80% (습도)
        Returns: {warehouse_code: 기록 성공 건수}
        """
        results: dict[str, int] = {}
        for code, config in self.WAREHOUSE_CONFIG.items():
            count = 0
            if config["type"] == "COLD":
                temp = round(random.uniform(-1.0, 4.0), 1)
                humidity = round(random.uniform(85.0, 95.0), 1)
            else:
                temp = round(random.uniform(-18.0, -16.0), 1)
                humidity = round(random.uniform(70.0, 80.0), 1)

            if self.write_sensor_data(
                SensorDataWrite(
                    warehouse_code=code,
                    sensor_type="temperature",
                    value=temp,
                    unit="°C",
                )
            ):
                count += 1

            if self.write_sensor_data(
                SensorDataWrite(
                    warehouse_code=code,
                    sensor_type="humidity",
                    value=humidity,
                    unit="%",
                )
            ):
                count += 1

            results[code] = count
        return results


cold_storage = CRUDColdStorage()
