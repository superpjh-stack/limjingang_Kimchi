"""생산 보고서 스키마 모듈."""

from enum import Enum

from pydantic import BaseModel


class ReportPeriod(str, Enum):
    """보고서 기간 유형."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ProductionReportRow(BaseModel):
    """제품별 생산 실적 행."""

    product_name: str
    planned_qty: int
    actual_qty: int
    defect_qty: int
    achievement_rate: float  # actual / planned * 100
    defect_rate: float       # defect / actual * 100 (actual > 0 일 때)


class ProductionReport(BaseModel):
    """생산 보고서 응답 스키마."""

    period: str          # daily / weekly / monthly
    date_from: str
    date_to: str
    total_planned: int
    total_actual: int
    total_defect: int
    overall_achievement: float
    overall_defect_rate: float
    by_product: list[ProductionReportRow]
    ccp_violations: int
    equipment_downtime_minutes: int
