"""AI 분석 서비스 — 통계 기반 지능형 생산 분석 (ML 라이브러리 불필요)

Sprint 5: AI Agent 대시보드 백엔드 서비스
- 생산량 예측 (이동평균)
- 원재료 발주 추천 (BOM × 생산계획)
- 설비 예방정비 알림
- 불량률 트렌드 분석
- 납기 리스크 분석
"""

from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from typing import Optional


class AIAnalyzer:
    TARGET_DEFECT_RATE = 1.3  # 목표 불량률 (%)

    # ──────────────────────────────────────────────
    # 1. 생산량 예측 (이동평균)
    # ──────────────────────────────────────────────
    def get_production_forecast(self, db: Session) -> dict:
        today = date.today()
        fourteen_days_ago = today - timedelta(days=14)
        seven_days_ago = today - timedelta(days=7)

        # 최근 14일 WorkOrder 완료 실적
        rows = db.execute(
            text("""
                SELECT work_date, SUM(actual_qty) AS daily_qty
                FROM tb_work_order
                WHERE work_date >= :start_date
                  AND work_date < :today
                  AND status IN ('COMPLETED', 'CLOSED')
                  AND actual_qty IS NOT NULL
                GROUP BY work_date
                ORDER BY work_date
            """),
            {"start_date": fourteen_days_ago, "today": today},
        ).fetchall()

        if not rows:
            return {
                "tomorrow_forecast": 0.0,
                "this_week_total": 0.0,
                "confidence": "LOW",
                "basis_days": 0,
                "daily_avg": 0.0,
                "trend": "STABLE",
            }

        daily_qtys = [float(r.daily_qty or 0) for r in rows]
        basis_days = len(daily_qtys)

        daily_avg = sum(daily_qtys) / basis_days if basis_days > 0 else 0.0

        # 추세: 최근 7일 vs 이전 7일 평균 비교
        recent_7_rows = [
            float(r.daily_qty or 0)
            for r in rows
            if r.work_date >= seven_days_ago
        ]
        prev_7_rows = [
            float(r.daily_qty or 0)
            for r in rows
            if r.work_date < seven_days_ago
        ]

        if recent_7_rows and prev_7_rows:
            recent_avg = sum(recent_7_rows) / len(recent_7_rows)
            prev_avg = sum(prev_7_rows) / len(prev_7_rows)
            if prev_avg == 0:
                trend = "STABLE"
            elif recent_avg > prev_avg * 1.05:
                trend = "UP"
            elif recent_avg < prev_avg * 0.95:
                trend = "DOWN"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        tomorrow_forecast = daily_avg
        # 이번 주 남은 영업일 수 계산 (월~금)
        weekday = today.weekday()  # 0=월 ... 6=일
        remaining_weekdays = max(0, 4 - weekday)  # 오늘 포함하지 않음
        this_week_total = daily_avg * (remaining_weekdays + 1)

        return {
            "tomorrow_forecast": round(tomorrow_forecast, 1),
            "this_week_total": round(this_week_total, 1),
            "confidence": "HIGH" if basis_days >= 7 else "LOW",
            "basis_days": basis_days,
            "daily_avg": round(daily_avg, 1),
            "trend": trend,
        }

    # ──────────────────────────────────────────────
    # 2. 원재료 발주 추천
    # ──────────────────────────────────────────────
    def get_material_reorder_recommendations(self, db: Session) -> list:
        # 확정된 생산계획 × BOM 소요량
        plan_requirements = db.execute(
            text("""
                SELECT
                    bd.raw_material_id,
                    rm.material_name,
                    rm.material_code,
                    rm.unit,
                    SUM(pp.planned_qty * bd.quantity_per_unit) AS required_qty,
                    JSON_ARRAYAGG(
                        JSON_OBJECT('plan_no', pp.plan_no, 'planned_qty', pp.planned_qty)
                    ) AS related_plans
                FROM tb_production_plan pp
                JOIN tb_bom b ON b.product_id = pp.product_id AND b.is_active = TRUE
                JOIN tb_bom_detail bd ON bd.bom_id = b.bom_id
                JOIN tb_raw_material rm ON rm.raw_material_id = bd.raw_material_id
                WHERE pp.status IN ('CONFIRMED', 'IN_PROGRESS')
                  AND pp.plan_date >= :today
                GROUP BY bd.raw_material_id, rm.material_name, rm.material_code, rm.unit
            """),
            {"today": date.today()},
        ).fetchall()

        if not plan_requirements:
            return []

        # 현재 재고
        stock_rows = db.execute(
            text("""
                SELECT raw_material_id, SUM(current_qty) AS current_qty
                FROM tb_material_stock
                GROUP BY raw_material_id
            """)
        ).fetchall()
        stock_map = {r.raw_material_id: float(r.current_qty or 0) for r in stock_rows}

        # 7일 평균 사용량 (안전재고 기준)
        usage_rows = db.execute(
            text("""
                SELECT raw_material_id, SUM(ABS(trans_qty)) / 7.0 AS daily_avg
                FROM tb_material_transaction
                WHERE trans_date >= :start_date
                  AND trans_type = 'ISSUE'
                GROUP BY raw_material_id
            """),
            {"start_date": date.today() - timedelta(days=7)},
        ).fetchall()
        usage_map = {r.raw_material_id: float(r.daily_avg or 0) for r in usage_rows}

        recommendations = []
        for row in plan_requirements:
            mat_id = row.raw_material_id
            current_stock = stock_map.get(mat_id, 0.0)
            required_qty = float(row.required_qty or 0)
            shortage = required_qty - current_stock

            if shortage <= 0:
                continue  # 재고 충분

            daily_avg_use = usage_map.get(mat_id, 0.0)
            safety_stock = daily_avg_use * 7 * 1.5  # 7일 × 1.5배 안전재고
            recommended_order_qty = shortage + safety_stock

            # 긴급도 판단
            if current_stock <= 0:
                urgency = "CRITICAL"
            elif current_stock < required_qty * 0.3:
                urgency = "HIGH"
            else:
                urgency = "MEDIUM"

            # related_plans JSON 파싱 (MySQL JSON_ARRAYAGG)
            try:
                import json
                related = json.loads(row.related_plans) if row.related_plans else []
            except Exception:
                related = []

            recommendations.append({
                "material_id": mat_id,
                "material_name": row.material_name,
                "material_code": row.material_code,
                "current_stock": round(current_stock, 2),
                "required_qty": round(required_qty, 2),
                "shortage_qty": round(shortage, 2),
                "unit": row.unit or "kg",
                "urgency": urgency,
                "recommended_order_qty": round(recommended_order_qty, 2),
                "related_plans": related[:5],  # 최대 5건
            })

        # 긴급도 순 정렬
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
        recommendations.sort(key=lambda x: urgency_order.get(x["urgency"], 9))
        return recommendations

    # ──────────────────────────────────────────────
    # 3. 설비 예방정비 알림
    # ──────────────────────────────────────────────
    def get_equipment_alerts(self, db: Session) -> list:
        today = date.today()
        seven_days_later = today + timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        alerts = []

        # 점검 임박 설비
        maintenance_rows = db.execute(
            text("""
                SELECT equipment_id, equipment_name, next_maintenance_date
                FROM tb_equipment
                WHERE next_maintenance_date <= :deadline
                  AND status != 'INACTIVE'
                ORDER BY next_maintenance_date
            """),
            {"deadline": seven_days_later},
        ).fetchall()

        for row in maintenance_rows:
            maint_date = row.next_maintenance_date
            if maint_date:
                days_until = (maint_date - today).days
                alert_level = "CRITICAL" if days_until <= 2 else "WARNING"
                alerts.append({
                    "equipment_id": row.equipment_id,
                    "equipment_name": row.equipment_name,
                    "alert_type": "MAINTENANCE_DUE",
                    "alert_level": alert_level,
                    "days_until_maintenance": days_until,
                    "failure_count_30d": None,
                    "recommendation": (
                        f"D-{days_until}일 이내 점검을 실시하세요."
                        if days_until >= 0
                        else f"{abs(days_until)}일 점검 초과 — 즉시 점검 필요"
                    ),
                })

        # 반복 고장 설비 (최근 30일 2건 이상)
        failure_rows = db.execute(
            text("""
                SELECT e.equipment_id, e.equipment_name, COUNT(ef.failure_id) AS failure_count
                FROM tb_equipment e
                JOIN tb_equipment_failure ef ON ef.equipment_id = e.equipment_id
                WHERE ef.failure_date >= :start_date
                  AND e.status != 'INACTIVE'
                GROUP BY e.equipment_id, e.equipment_name
                HAVING COUNT(ef.failure_id) >= 2
                ORDER BY failure_count DESC
            """),
            {"start_date": thirty_days_ago},
        ).fetchall()

        existing_ids = {a["equipment_id"] for a in alerts}
        for row in failure_rows:
            if row.equipment_id in existing_ids:
                # 이미 MAINTENANCE_DUE 알림에 포함된 경우 failure_count 보강
                for a in alerts:
                    if a["equipment_id"] == row.equipment_id:
                        a["failure_count_30d"] = row.failure_count
                continue
            alerts.append({
                "equipment_id": row.equipment_id,
                "equipment_name": row.equipment_name,
                "alert_type": "REPEAT_FAILURE",
                "alert_level": "CRITICAL" if row.failure_count >= 4 else "WARNING",
                "days_until_maintenance": None,
                "failure_count_30d": row.failure_count,
                "recommendation": (
                    f"최근 30일간 {row.failure_count}회 고장 — 예방 정비 또는 부품 교체 검토 필요"
                ),
            })

        return alerts

    # ──────────────────────────────────────────────
    # 4. 불량률 트렌드 분석
    # ──────────────────────────────────────────────
    def get_defect_trend_analysis(self, db: Session) -> dict:
        today = date.today()
        fourteen_days_ago = today - timedelta(days=14)

        # 일별 불량률
        daily_rows = db.execute(
            text("""
                SELECT
                    work_date,
                    SUM(actual_qty)   AS total_actual,
                    SUM(defect_qty)   AS total_defect
                FROM tb_work_order
                WHERE work_date >= :start_date
                  AND work_date < :today
                  AND actual_qty > 0
                  AND status IN ('COMPLETED', 'CLOSED')
                GROUP BY work_date
                ORDER BY work_date
            """),
            {"start_date": fourteen_days_ago, "today": today},
        ).fetchall()

        daily_trend = []
        for row in daily_rows:
            actual = float(row.total_actual or 0)
            defect = float(row.total_defect or 0)
            rate = round((defect / actual * 100) if actual > 0 else 0.0, 2)
            daily_trend.append({"date": str(row.work_date), "defect_rate": rate})

        # 현재 불량률 (최근 7일)
        recent_rates = [d["defect_rate"] for d in daily_trend[-7:]]
        current_rate = round(sum(recent_rates) / len(recent_rates), 2) if recent_rates else 0.0

        # 추세: 최근 7일 vs 이전 7일
        prev_rates = [d["defect_rate"] for d in daily_trend[:-7]]
        if recent_rates and prev_rates:
            r_avg = sum(recent_rates) / len(recent_rates)
            p_avg = sum(prev_rates) / len(prev_rates)
            if r_avg < p_avg * 0.95:
                trend = "IMPROVING"
            elif r_avg > p_avg * 1.05:
                trend = "WORSENING"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        # 상태
        if current_rate <= self.TARGET_DEFECT_RATE:
            status = "GOOD"
        elif current_rate <= self.TARGET_DEFECT_RATE * 1.5:
            status = "WARNING"
        else:
            status = "DANGER"

        # 공정별 불량률 (tb_work_order.process_name or 공정 조인)
        process_rows = db.execute(
            text("""
                SELECT
                    p.process_name,
                    SUM(wo.actual_qty) AS total_actual,
                    SUM(wo.defect_qty) AS total_defect
                FROM tb_work_order wo
                JOIN tb_process p ON p.process_id = wo.process_id
                WHERE wo.work_date >= :start_date
                  AND wo.actual_qty > 0
                  AND wo.status IN ('COMPLETED', 'CLOSED')
                GROUP BY p.process_name
                ORDER BY (SUM(wo.defect_qty) / NULLIF(SUM(wo.actual_qty), 0)) DESC
                LIMIT 3
            """),
            {"start_date": fourteen_days_ago},
        ).fetchall()

        by_process = []
        for row in process_rows:
            actual = float(row.total_actual or 0)
            defect = float(row.total_defect or 0)
            rate = round((defect / actual * 100) if actual > 0 else 0.0, 2)
            by_process.append({"process_name": row.process_name, "defect_rate": rate})

        return {
            "current_defect_rate": current_rate,
            "target_defect_rate": self.TARGET_DEFECT_RATE,
            "status": status,
            "trend": trend,
            "daily_trend": daily_trend,
            "by_process": by_process,
        }

    # ──────────────────────────────────────────────
    # 5. 납기 리스크 분석
    # ──────────────────────────────────────────────
    def get_delivery_risk_analysis(self, db: Session) -> list:
        today = date.today()
        risk_deadline = today + timedelta(days=7)  # 7일 이내 납기를 위험으로 간주

        order_rows = db.execute(
            text("""
                SELECT
                    o.order_id,
                    o.order_no,
                    c.customer_name,
                    o.delivery_date,
                    o.status,
                    o.total_qty,
                    EXISTS (
                        SELECT 1 FROM tb_production_plan pp
                        WHERE pp.order_id = o.order_id
                          AND pp.status NOT IN ('CANCELLED')
                    ) AS has_production_plan
                FROM tb_order o
                JOIN tb_customer c ON c.customer_id = o.customer_id
                WHERE o.delivery_date <= :deadline
                  AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'DELIVERED')
                ORDER BY o.delivery_date
            """),
            {"deadline": risk_deadline},
        ).fetchall()

        risks = []
        for row in order_rows:
            delivery_date = row.delivery_date
            days_remaining = (delivery_date - today).days if delivery_date else 999

            # 리스크 레벨
            if days_remaining <= 0:
                risk_level = "CRITICAL"
            elif days_remaining <= 3:
                risk_level = "HIGH"
            else:
                risk_level = "MEDIUM"

            has_plan = bool(row.has_production_plan)

            # 권장조치
            if days_remaining <= 0:
                recommendation = "납기 초과 — 즉시 고객 연락 및 출하 조치 필요"
            elif not has_plan:
                recommendation = "생산계획 미수립 — 즉시 생산계획 수립 필요"
            elif days_remaining <= 3:
                recommendation = "D-3일 긴급 납기 — 생산 우선순위 상향 조정"
            else:
                recommendation = "납기 임박 — 생산 진행 상황 모니터링 필요"

            risks.append({
                "order_id": row.order_id,
                "order_no": row.order_no,
                "customer_name": row.customer_name,
                "delivery_date": str(delivery_date),
                "days_remaining": days_remaining,
                "status": row.status,
                "risk_level": risk_level,
                "has_production_plan": has_plan,
                "recommendation": recommendation,
            })

        return risks

    # ──────────────────────────────────────────────
    # 6. 통합 AI 대시보드 요약
    # ──────────────────────────────────────────────
    def get_ai_dashboard_summary(self, db: Session) -> dict:
        production_forecast = self.get_production_forecast(db)
        material_alerts = self.get_material_reorder_recommendations(db)
        equipment_alerts = self.get_equipment_alerts(db)
        defect_trend = self.get_defect_trend_analysis(db)
        delivery_risks = self.get_delivery_risk_analysis(db)

        total_alert_count = (
            len(material_alerts)
            + len(equipment_alerts)
            + len([r for r in delivery_risks if r["risk_level"] in ("CRITICAL", "HIGH")])
            + (1 if defect_trend["status"] in ("WARNING", "DANGER") else 0)
        )

        return {
            "production_forecast": production_forecast,
            "material_alerts": material_alerts,
            "equipment_alerts": equipment_alerts,
            "defect_trend": defect_trend,
            "delivery_risks": delivery_risks,
            "generated_at": datetime.now().isoformat(),
            "total_alert_count": total_alert_count,
        }


# 싱글톤 인스턴스
ai_analyzer = AIAnalyzer()
