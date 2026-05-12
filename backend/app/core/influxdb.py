"""InfluxDB 2.7 클라이언트 모듈 — 냉장창고 센서 데이터 저장소."""

from influxdb_client import InfluxDBClient
from influxdb_client.client.write_api import SYNCHRONOUS

from app.core.config import settings


def get_influx_client() -> InfluxDBClient:
    """InfluxDB 클라이언트 인스턴스를 반환합니다."""
    return InfluxDBClient(
        url=settings.INFLUXDB_URL,
        token=settings.INFLUXDB_TOKEN,
        org=settings.INFLUXDB_ORG,
    )


def get_write_api():
    """동기 쓰기 API를 반환합니다."""
    client = get_influx_client()
    return client.write_api(write_options=SYNCHRONOUS)


def get_query_api():
    """쿼리 API를 반환합니다."""
    client = get_influx_client()
    return client.query_api()
