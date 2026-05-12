"""KPI 집계 CRUD 모듈.

생산 KPI, 수주 KPI, 재고 현황 KPI, 대시보드 요약을 제공합니다.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.order import Order, OrderDetail
from app.models.production import WorkOrder
from app.models.inventory import MaterialStock, ProductStock


class CRUDKpi:
    """KPI 집계 CRUD."""

    # ------------------------------------------------------------------
    # 생산 KPI
    # ------------------------------------------------------------------

    def get_production_kpi(
        self,
        db: Session,
        date_from: date,
        date_to: date,
    ) -> Dict[str, Any]:
        """생산 KPI 집계.

        - 일별 계획/실적/불량 수량
        - 달성률 = actual / planned * 100
        - 불량률 = defect / actual * 100
        - 시간당 생산량 = actual_qty / 작업시간 합계
        """
        dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

        work_orders = (
            db.query(WorkOrder)
            .filter(
                WorkOrder.work_date >= dt_from,
                WorkOrder.work_date <= dt_to,
                WorkOrder.is_deleted == False,
                WorkOrder.status != "CANCELLED",
            )
            .all()
        )

        total_planned = sum(w.planned_qty for w in work_orders)
        total_actual = sum(w.actual_qty for w in work_orders)
        total_defect = sum(w.defect_qty for w in work_orders)

        # 시간당 생산량 계산
        total_hours = 0.0
        for w in work_orders:
            if w.start_datetime and w.end_datetime:
                delta = w.end_datetime - w.start_datetime
                total_hours += delta.total_seconds() / 3600

        avg_hourly = round(total_actual / total_hours, 2) if total_hours > 0 else 0.0
        achievement_rate = round(total_actual / total_planned * 100, 2) if total_planned > 0 else 0.0
        defect_rate = round(total_defect / total_actual * 100, 2) if total_actual > 0 else 0.0

        # 일별 트렌드
        daily_map: Dict[str, Dict[str, int]] = {}
        for w in work_orders:
            d_str = w.work_date.strftime("%Y-%m-%d")
            if d_str not in daily_map:
                daily_map[d_str] = {"planned": 0, "actual": 0, "defect": 0}
            daily_map[d_str]["planned"] += w.planned_qty
            daily_map[d_str]["actual"] += w.actual_qty
            daily_map[d_str]["defect"] += w.defect_qty

        daily_trend = [
            {"date": d, "planned": v["planned"], "actual": v["actual"], "defect": v["defect"]}
            for d, v in sorted(daily_map.items())
        ]

        return {
            "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
            "total_planned": total_planned,
            "total_actual": total_actual,
            "total_defect": total_defect,
            "achievement_rate": achievement_rate,
            "defect_rate": defect_rate,
            "avg_hourly_production": avg_hourly,
            "daily_trend": daily_trend,
        }

    # ------------------------------------------------------------------
    # 수주 KPI
    # ------------------------------------------------------------------

    def get_order_kpi(
        self,
        db: Session,
        date_from: date,
        date_to: date,
    ) -> Dict[str, Any]:
        """수주 KPI 집계.

        - 건수, 금액 합계
        - 상태별 분포
        - 거래처별 상위 10
        """
        dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

        orders = (
            db.query(Order)
            .filter(
                Order.order_date >= dt_from,
                Order.order_date <= dt_to,
                Order.is_deleted == False,
            )
            .all()
        )

        total_orders = len(orders)
        total_amount = sum(o.total_amount for o in orders)

        by_status: Dict[str, int] = {}
        by_customer_map: Dict[int, Dict[str, Any]] = {}

        for o in orders:
            by_status[o.status] = by_status.get(o.status, 0) + 1
            cid = o.customer_id
            if cid not in by_customer_map:
                by_customer_map[cid] = {
                    "customer_id": cid,
                    "customer_name": o.customer.customer_name if o.customer else "",
                    "order_count": 0,
                    "total_amount": 0,
                }
            by_customer_map[cid]["order_count"] += 1
            by_customer_map[cid]["total_amount"] += o.total_amount

        by_customer = sorted(
            by_customer_map.values(),
            key=lambda x: x["total_amount"],
            reverse=True,
        )[:10]

        return {
            "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
            "total_orders": total_orders,
            "total_amount": total_amount,
            "by_status": by_status,
            "by_customer": by_customer,
        }

    # ------------------------------------------------------------------
    # 재고 현황 KPI
    # ------------------------------------------------------------------

    def get_inventory_kpi(self, db: Session) -> Dict[str, Any]:
        """현재 재고 현황 KPI.

        - 원자재 부족/유통기한 경고 목록
        - 완제품 재고 총량
        - 재고 부족 품목 (current_qty <= 0 또는 유통기한 30일 이내)
        """
        warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)

        # 원자재 재고 집계
        material_stocks = (
            db.query(MaterialStock)
            .filter(MaterialStock.is_deleted == False)
            .all()
        )

        material_alerts = []
        for s in material_stocks:
            alert_type = None
            if float(s.current_qty) <= 0:
                alert_type = "NO_STOCK"
            elif s.expiry_date and s.expiry_date.replace(tzinfo=timezone.utc) <= warning_threshold:
                alert_type = "EXPIRY_WARNING"
            if alert_type:
                material_alerts.append({
                    "stock_id": s.id,
                    "raw_material_id": s.raw_material_id,
                    "raw_material_name": s.raw_material.material_name if s.raw_material else "",
                    "warehouse_id": s.warehouse_id,
                    "lot_no": s.lot_no,
                    "current_qty": float(s.current_qty),
                    "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
                    "alert_type": alert_type,
                })

        # 완제품 재고 집계
        product_stocks = (
            db.query(ProductStock)
            .filter(ProductStock.is_deleted == False, ProductStock.current_qty > 0)
            .all()
        )
        product_stock_total = sum(float(s.current_qty) for s in product_stocks)

        low_stock_items = []
        for s in product_stocks:
            if s.expiry_date and s.expiry_date.replace(tzinfo=timezone.utc) <= warning_threshold:
                low_stock_items.append({
                    "stock_id": s.id,
                    "product_id": s.product_id,
                    "product_name": s.product.product_name if s.product else "",
                    "warehouse_id": s.warehouse_id,
                    "lot_no": s.lot_no,
                    "current_qty": float(s.current_qty),
                    "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
                    "alert_type": "EXPIRY_WARNING",
                })

        return {
            "material_alerts": material_alerts,
            "material_alert_count": len(material_alerts),
            "product_stock_total": product_stock_total,
            "low_stock_items": low_stock_items,
            "low_stock_count": len(low_stock_items),
        }

    # ------------------------------------------------------------------
    # 대시보드 요약
    # ------------------------------------------------------------------

    def get_dashboard_summary(self, db: Session) -> Dict[str, Any]:
        """대시보드 요약.

        - 오늘 작업지시 현황 (IN_PROGRESS 수, 완료 수)
        - 이번 달 수주 건수/금액
        - 재고 경고 건수
        """
        today = date.today()
        today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
        today_end = today_start + timedelta(days=1)

        month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

        # 오늘 작업지시
        today_work_orders = (
            db.query(WorkOrder)
            .filter(
                WorkOrder.work_date >= today_start,
                WorkOrder.work_date < today_end,
                WorkOrder.is_deleted == False,
            )
            .all()
        )
        in_progress_count = sum(1 for w in today_work_orders if w.status == "IN_PROGRESS")
        completed_count = sum(1 for w in today_work_orders if w.status == "COMPLETED")
        today_planned_qty = sum(w.planned_qty for w in today_work_orders)
        today_actual_qty = sum(w.actual_qty for w in today_work_orders)

        # 이번 달 수주
        month_orders = (
            db.query(Order)
            .filter(
                Order.order_date >= month_start,
                Order.is_deleted == False,
            )
            .all()
        )
        month_order_count = len(month_orders)
        month_order_amount = sum(o.total_amount for o in month_orders)

        # 재고 경고 건수
        warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)
        material_alert_count = (
            db.query(MaterialStock)
            .filter(
                MaterialStock.is_deleted == False,
                (MaterialStock.current_qty <= 0)
                | (
                    and_(
                        MaterialStock.expiry_date.isnot(None),
                        MaterialStock.expiry_date <= warning_threshold,
                    )
                ),
            )
            .count()
        )

        return {
            "date": today.isoformat(),
            "production": {
                "total_work_orders": len(today_work_orders),
                "in_progress": in_progress_count,
                "completed": completed_count,
                "planned_qty": today_planned_qty,
                "actual_qty": today_actual_qty,
                "achievement_rate": round(today_actual_qty / today_planned_qty * 100, 2) if today_planned_qty > 0 else 0.0,
            },
            "orders": {
                "month_count": month_order_count,
                "month_amount": month_order_amount,
            },
            "inventory": {
                "material_alert_count": material_alert_count,
            },
        }


crud_kpi = CRUDKpi()
