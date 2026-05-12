"""OEE(설비종합효율) CRUD 모듈."""

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.oee import OeeRecord
from app.schemas.oee import OeeRecordCreate


def _calc_oee(
    planned_time: int,
    actual_time: int,
    ideal_cycle_time: Optional[float],
    total_count: int,
    good_count: int,
) -> tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """OEE 구성요소를 계산합니다. 0 나눗셈을 방지합니다.

    Returns:
        (availability, performance, quality, oee) 튜플 (%)
    """
    # 가용률 = 실 가동 시간 / 계획 가동 시간 * 100
    availability = (actual_time / planned_time * 100) if planned_time > 0 else None

    # 양품률 = 양품 수량 / 총 생산 수량 * 100
    quality = (good_count / total_count * 100) if total_count > 0 else None

    # 성능률
    if ideal_cycle_time and actual_time > 0:
        # (이상 사이클 타임 [초] * 총 수량) / (실 가동 시간 [분] * 60) * 100
        performance = (ideal_cycle_time * total_count) / (actual_time * 60) * 100
    else:
        performance = quality  # ideal_cycle_time 없으면 quality로 대체

    # OEE = 가용률 × 성능률 × 양품률 / 10000
    if availability is not None and performance is not None and quality is not None:
        oee = round(availability * performance * quality / 10000, 2)
    else:
        oee = None

    return (
        round(availability, 2) if availability is not None else None,
        round(performance, 2) if performance is not None else None,
        round(quality, 2) if quality is not None else None,
        oee,
    )


class CRUDOee:
    """OEE CRUD 클래스."""

    def create_or_update(
        self,
        db: Session,
        *,
        data: OeeRecordCreate,
        created_by: str,
    ) -> OeeRecord:
        """OEE 기록을 생성하거나 업데이트합니다.

        동일한 equipment_id + record_date 가 존재하면 업데이트,
        없으면 생성합니다. OEE는 자동 계산됩니다.

        Args:
            db: 데이터베이스 세션
            data: 생성/수정 스키마
            created_by: 생성/수정자

        Returns:
            OEE 기록 객체
        """
        availability, performance, quality, oee = _calc_oee(
            planned_time=data.planned_time,
            actual_time=data.actual_time,
            ideal_cycle_time=data.ideal_cycle_time,
            total_count=data.total_count,
            good_count=data.good_count,
        )

        existing = (
            db.query(OeeRecord)
            .filter(
                OeeRecord.equipment_id == data.equipment_id,
                OeeRecord.record_date == data.record_date,
                OeeRecord.is_deleted == False,
            )
            .first()
        )

        if existing:
            existing.planned_time = data.planned_time
            existing.downtime = data.downtime
            existing.actual_time = data.actual_time
            existing.ideal_cycle_time = data.ideal_cycle_time
            existing.total_count = data.total_count
            existing.good_count = data.good_count
            existing.defect_count = data.defect_count
            existing.availability = availability
            existing.performance = performance
            existing.quality = quality
            existing.oee = oee
            existing.notes = data.notes
            existing.updated_by = created_by
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        obj = OeeRecord(
            equipment_id=data.equipment_id,
            record_date=data.record_date,
            planned_time=data.planned_time,
            downtime=data.downtime,
            actual_time=data.actual_time,
            ideal_cycle_time=data.ideal_cycle_time,
            total_count=data.total_count,
            good_count=data.good_count,
            defect_count=data.defect_count,
            availability=availability,
            performance=performance,
            quality=quality,
            oee=oee,
            notes=data.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def get_list(
        self,
        db: Session,
        *,
        equipment_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[OeeRecord], int]:
        """OEE 기록 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            equipment_id: 설비 ID 필터
            date_from: 시작일
            date_to: 종료일
            skip: 오프셋
            limit: 최대 반환 수

        Returns:
            (기록 목록, 전체 개수) 튜플
        """
        query = db.query(OeeRecord).filter(OeeRecord.is_deleted == False)

        if equipment_id:
            query = query.filter(OeeRecord.equipment_id == equipment_id)
        if date_from:
            query = query.filter(OeeRecord.record_date >= date_from)
        if date_to:
            query = query.filter(OeeRecord.record_date <= date_to)

        total = query.count()
        items = (
            query.order_by(OeeRecord.record_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_dashboard(self, db: Session) -> dict:
        """전체 설비 OEE 요약 및 최근 30일 트렌드를 반환합니다.

        Args:
            db: 데이터베이스 세션

        Returns:
            {summary, equipment_oee, trend}
        """
        target_oee = 85.0
        thirty_days_ago = date.today() - timedelta(days=30)

        # 설비별 최근 30일 평균 OEE
        from app.models.equipment import Equipment

        equipment_oee_rows = (
            db.query(
                OeeRecord.equipment_id,
                Equipment.equipment_name,
                func.avg(OeeRecord.oee).label("avg_oee"),
                func.avg(OeeRecord.availability).label("avg_avail"),
                func.avg(OeeRecord.performance).label("avg_perf"),
                func.avg(OeeRecord.quality).label("avg_quality"),
            )
            .join(Equipment, Equipment.id == OeeRecord.equipment_id)
            .filter(
                OeeRecord.is_deleted == False,
                OeeRecord.record_date >= thirty_days_ago,
                OeeRecord.oee.isnot(None),
            )
            .group_by(OeeRecord.equipment_id, Equipment.equipment_name)
            .all()
        )

        equipment_oee = [
            {
                "equipment_id": row.equipment_id,
                "equipment_name": row.equipment_name,
                "oee": round(float(row.avg_oee), 2) if row.avg_oee else None,
                "availability": round(float(row.avg_avail), 2) if row.avg_avail else None,
                "performance": round(float(row.avg_perf), 2) if row.avg_perf else None,
                "quality": round(float(row.avg_quality), 2) if row.avg_quality else None,
            }
            for row in equipment_oee_rows
        ]

        avg_oee = (
            sum(e["oee"] for e in equipment_oee if e["oee"] is not None) / len(equipment_oee)
            if equipment_oee
            else None
        )

        summary = {
            "avg_oee": round(avg_oee, 2) if avg_oee is not None else None,
            "equipment_count": len(equipment_oee),
            "target_oee": target_oee,
        }

        # 최근 30일 전체 평균 OEE 트렌드 (일별)
        trend_rows = (
            db.query(
                OeeRecord.record_date,
                func.avg(OeeRecord.oee).label("avg_oee"),
            )
            .filter(
                OeeRecord.is_deleted == False,
                OeeRecord.record_date >= thirty_days_ago,
                OeeRecord.oee.isnot(None),
            )
            .group_by(OeeRecord.record_date)
            .order_by(OeeRecord.record_date.asc())
            .all()
        )
        trend = [
            {
                "date": str(row.record_date),
                "avg_oee": round(float(row.avg_oee), 2) if row.avg_oee else None,
            }
            for row in trend_rows
        ]

        return {
            "summary": summary,
            "equipment_oee": equipment_oee,
            "trend": trend,
        }

    def get_trend(
        self,
        db: Session,
        *,
        equipment_id: int,
        days: int = 30,
    ) -> list[OeeRecord]:
        """설비별 OEE 트렌드를 반환합니다.

        Args:
            db: 데이터베이스 세션
            equipment_id: 설비 ID
            days: 조회 기간 (기본 30일)

        Returns:
            OEE 기록 목록 (날짜 오름차순)
        """
        date_from = date.today() - timedelta(days=days)
        return (
            db.query(OeeRecord)
            .filter(
                OeeRecord.is_deleted == False,
                OeeRecord.equipment_id == equipment_id,
                OeeRecord.record_date >= date_from,
            )
            .order_by(OeeRecord.record_date.asc())
            .all()
        )

    def calculate_from_work_orders(
        self,
        db: Session,
        *,
        equipment_id: int,
        target_date: date,
        created_by: str,
    ) -> OeeRecord:
        """작업지시 실적으로부터 OEE를 자동 계산합니다.

        해당 equipment_id, 해당 date의 완료된 작업지시를 집계합니다.
        - total_count = sum(actual_qty)
        - good_count = total_count - sum(defect_qty)
        - actual_time: start_datetime ~ end_datetime 합산 (분)
        - planned_time: planned_start ~ planned_end 합산 (없으면 480)

        Args:
            db: 데이터베이스 세션
            equipment_id: 설비 ID
            target_date: 계산 대상 일자
            created_by: 생성자

        Returns:
            OEE 기록 객체
        """
        from app.models.production import WorkOrder, WorkOrderResult

        work_orders = (
            db.query(WorkOrder)
            .filter(
                WorkOrder.is_deleted == False,
                WorkOrder.equipment_id == equipment_id,
                WorkOrder.status == "COMPLETED",
                func.date(WorkOrder.planned_start) == target_date,
            )
            .all()
        )

        total_count = 0
        defect_count = 0
        actual_time_min = 0
        planned_time_min = 0

        for wo in work_orders:
            # 작업실적 집계
            results = (
                db.query(WorkOrderResult)
                .filter(
                    WorkOrderResult.work_order_id == wo.id,
                    WorkOrderResult.is_deleted == False,
                )
                .all()
            )
            for r in results:
                total_count += int(r.actual_qty or 0)
                defect_count += int(r.defect_qty or 0)

            # 실 가동 시간 (분)
            if wo.start_datetime and wo.end_datetime:
                delta = wo.end_datetime - wo.start_datetime
                actual_time_min += int(delta.total_seconds() / 60)

            # 계획 가동 시간 (분)
            if wo.planned_start and wo.planned_end:
                delta = wo.planned_end - wo.planned_start
                planned_time_min += int(delta.total_seconds() / 60)

        if planned_time_min == 0:
            planned_time_min = 480

        good_count = total_count - defect_count

        data = OeeRecordCreate(
            equipment_id=equipment_id,
            record_date=target_date,
            planned_time=planned_time_min,
            downtime=max(0, planned_time_min - actual_time_min),
            actual_time=actual_time_min,
            total_count=total_count,
            good_count=max(0, good_count),
            defect_count=defect_count,
        )
        return self.create_or_update(db, data=data, created_by=created_by)


crud_oee = CRUDOee()
