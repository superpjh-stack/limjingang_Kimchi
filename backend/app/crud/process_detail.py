"""공정별 특화 실적 CRUD 모듈 (Sprint 5).

세척·절임·양념버무림·포장·입고전처리 공정 실적의 생성·조회·집계를 담당합니다.
CCP 자동 판정, 절임시간 자동계산, 불량률 계산, 공정별 수율 집계를 포함합니다.
"""

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import and_, func, case
from sqlalchemy.orm import Session

from app.models.process_detail import (
    PackagingRecord,
    PreprocessRecord,
    SaltingRecord,
    SeasoningRecord,
    WashRecord,
)
from app.models.production import WorkOrder
from app.schemas.process_detail import (
    PackagingRecordCreate,
    PackagingRecordUpdate,
    PreprocessRecordCreate,
    PreprocessRecordUpdate,
    SaltingRecordCreate,
    SaltingRecordUpdate,
    SeasoningRecordCreate,
    SeasoningRecordUpdate,
    WashRecordCreate,
    WashRecordUpdate,
)


# ---------------------------------------------------------------------------
# 내부 유틸리티
# ---------------------------------------------------------------------------

def _compute_wash_result(temp: Optional[float], ph: Optional[float]) -> str:
    """세척 CCP 판정. 온도 1~15°C, pH 6.5~8.5 이탈 시 FAIL."""
    if temp is not None and not (1.0 <= temp <= 15.0):
        return "FAIL"
    if ph is not None and not (6.5 <= ph <= 8.5):
        return "FAIL"
    return "PASS"


def _compute_salting_result(
    concentration: Optional[float],
    duration_min: Optional[int],
    salinity: Optional[float],
) -> str:
    """절임 CCP 판정. 염수농도 15~20%, 절임시간 360~1080분, 염도 2.5~3.0% 이탈 시 FAIL."""
    if concentration is not None and not (15.0 <= concentration <= 20.0):
        return "FAIL"
    if duration_min is not None and not (360 <= duration_min <= 1080):
        return "FAIL"
    if salinity is not None and not (2.5 <= salinity <= 3.0):
        return "FAIL"
    return "PASS"


def _compute_seasoning_result(mix_temp: Optional[float]) -> str:
    """양념버무림 CCP 판정. 혼합온도 -2~10°C 이탈 시 FAIL."""
    if mix_temp is not None and not (-2.0 <= mix_temp <= 10.0):
        return "FAIL"
    return "PASS"


def _compute_packaging_result(
    metal_result: str,
    total_pkg: Optional[int],
    defect_pkg: int,
    target_wt: Optional[float],
    actual_wt: Optional[float],
    tolerance_pct: float,
) -> tuple[str, Optional[float]]:
    """포장 결과 및 불량률 계산.

    Returns:
        (packaging_result, defect_rate)
    """
    defect_rate: Optional[float] = None
    if total_pkg and total_pkg > 0:
        defect_rate = round(defect_pkg / total_pkg * 100, 2)

    result = "PASS"
    if metal_result == "FAIL":
        result = "FAIL"
    elif target_wt and actual_wt:
        deviation = abs(actual_wt - target_wt) / target_wt * 100
        if deviation > tolerance_pct:
            result = "FAIL"

    return result, defect_rate


# ---------------------------------------------------------------------------
# 세척 실적 CRUD
# ---------------------------------------------------------------------------

class CRUDWashRecord:
    """세척 실적 CRUD."""

    def create(self, db: Session, *, obj_in: WashRecordCreate, created_by: str) -> WashRecord:
        """세척 실적 생성. CCP 자동 판정 및 작업지시 actual_qty 업데이트."""
        wash_result = _compute_wash_result(obj_in.wash_water_temp, obj_in.wash_water_ph)

        db_obj = WashRecord(
            work_order_id=obj_in.work_order_id,
            wash_water_temp=obj_in.wash_water_temp,
            wash_pressure=obj_in.wash_pressure,
            wash_duration=obj_in.wash_duration,
            wash_water_ph=obj_in.wash_water_ph,
            input_weight=obj_in.input_weight,
            output_weight=obj_in.output_weight,
            foreign_matter=obj_in.foreign_matter,
            foreign_detail=obj_in.foreign_detail,
            wash_result=wash_result,
            recorded_by=obj_in.recorded_by or created_by,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)

        # 작업지시 실적 수량 업데이트 (output_weight → kg 단위 반영)
        if obj_in.output_weight:
            wo = db.get(WorkOrder, obj_in.work_order_id)
            if wo:
                wo.actual_qty = int(obj_in.output_weight)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: WashRecord, obj_in: WashRecordUpdate, updated_by: str) -> WashRecord:
        """세척 실적 수정. CCP 재판정."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        # CCP 재판정
        db_obj.wash_result = _compute_wash_result(db_obj.wash_water_temp, db_obj.wash_water_ph)
        db_obj.updated_by = updated_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, record_id: int) -> Optional[WashRecord]:
        return db.query(WashRecord).filter(
            WashRecord.id == record_id,
            WashRecord.is_deleted == False,  # noqa: E712
        ).first()

    def get_by_work_order(self, db: Session, work_order_id: int) -> list[WashRecord]:
        return db.query(WashRecord).filter(
            WashRecord.work_order_id == work_order_id,
            WashRecord.is_deleted == False,  # noqa: E712
        ).order_by(WashRecord.recorded_at.desc()).all()

    def soft_delete(self, db: Session, *, db_obj: WashRecord, deleted_by: str) -> WashRecord:
        db_obj.is_deleted = True
        db_obj.updated_by = deleted_by
        db.commit()
        return db_obj


# ---------------------------------------------------------------------------
# 절임 실적 CRUD
# ---------------------------------------------------------------------------

class CRUDSaltingRecord:
    """절임 실적 CRUD."""

    def create(self, db: Session, *, obj_in: SaltingRecordCreate, created_by: str) -> SaltingRecord:
        """절임 실적 생성. 절임시간 자동계산 및 CCP 판정."""
        duration_min: Optional[int] = None
        if obj_in.salting_start_time and obj_in.salting_end_time:
            delta = obj_in.salting_end_time - obj_in.salting_start_time
            duration_min = int(delta.total_seconds() / 60)

        salting_result = _compute_salting_result(
            obj_in.brine_concentration, duration_min, obj_in.salinity_result
        )

        db_obj = SaltingRecord(
            work_order_id=obj_in.work_order_id,
            brine_concentration=obj_in.brine_concentration,
            salting_start_time=obj_in.salting_start_time,
            salting_end_time=obj_in.salting_end_time,
            salting_duration=duration_min,
            input_weight=obj_in.input_weight,
            output_weight=obj_in.output_weight,
            salinity_result=obj_in.salinity_result,
            water_rinse_count=obj_in.water_rinse_count,
            salting_result=salting_result,
            recorded_by=obj_in.recorded_by or created_by,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)

        if obj_in.output_weight:
            wo = db.get(WorkOrder, obj_in.work_order_id)
            if wo:
                wo.actual_qty = int(obj_in.output_weight)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: SaltingRecord, obj_in: SaltingRecordUpdate, updated_by: str) -> SaltingRecord:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        # 절임시간 재계산
        if db_obj.salting_start_time and db_obj.salting_end_time:
            delta = db_obj.salting_end_time - db_obj.salting_start_time
            db_obj.salting_duration = int(delta.total_seconds() / 60)

        db_obj.salting_result = _compute_salting_result(
            db_obj.brine_concentration, db_obj.salting_duration, db_obj.salinity_result
        )
        db_obj.updated_by = updated_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, record_id: int) -> Optional[SaltingRecord]:
        return db.query(SaltingRecord).filter(
            SaltingRecord.id == record_id,
            SaltingRecord.is_deleted == False,  # noqa: E712
        ).first()

    def get_by_work_order(self, db: Session, work_order_id: int) -> list[SaltingRecord]:
        return db.query(SaltingRecord).filter(
            SaltingRecord.work_order_id == work_order_id,
            SaltingRecord.is_deleted == False,  # noqa: E712
        ).order_by(SaltingRecord.recorded_at.desc()).all()

    def soft_delete(self, db: Session, *, db_obj: SaltingRecord, deleted_by: str) -> SaltingRecord:
        db_obj.is_deleted = True
        db_obj.updated_by = deleted_by
        db.commit()
        return db_obj


# ---------------------------------------------------------------------------
# 양념버무림 실적 CRUD
# ---------------------------------------------------------------------------

class CRUDSeasoningRecord:
    """양념버무림 실적 CRUD."""

    def create(self, db: Session, *, obj_in: SeasoningRecordCreate, created_by: str) -> SeasoningRecord:
        seasoning_result = _compute_seasoning_result(obj_in.mix_temperature)

        db_obj = SeasoningRecord(
            work_order_id=obj_in.work_order_id,
            seasoning_ratio=obj_in.seasoning_ratio,
            mix_temperature=obj_in.mix_temperature,
            mix_duration=obj_in.mix_duration,
            garlic_amount=obj_in.garlic_amount,
            pepper_amount=obj_in.pepper_amount,
            ginger_amount=obj_in.ginger_amount,
            input_weight=obj_in.input_weight,
            output_weight=obj_in.output_weight,
            seasoning_result=seasoning_result,
            lot_no=obj_in.lot_no,
            recorded_by=obj_in.recorded_by or created_by,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)

        if obj_in.output_weight:
            wo = db.get(WorkOrder, obj_in.work_order_id)
            if wo:
                wo.actual_qty = int(obj_in.output_weight)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: SeasoningRecord, obj_in: SeasoningRecordUpdate, updated_by: str) -> SeasoningRecord:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db_obj.seasoning_result = _compute_seasoning_result(db_obj.mix_temperature)
        db_obj.updated_by = updated_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, record_id: int) -> Optional[SeasoningRecord]:
        return db.query(SeasoningRecord).filter(
            SeasoningRecord.id == record_id,
            SeasoningRecord.is_deleted == False,  # noqa: E712
        ).first()

    def get_by_work_order(self, db: Session, work_order_id: int) -> list[SeasoningRecord]:
        return db.query(SeasoningRecord).filter(
            SeasoningRecord.work_order_id == work_order_id,
            SeasoningRecord.is_deleted == False,  # noqa: E712
        ).order_by(SeasoningRecord.recorded_at.desc()).all()

    def soft_delete(self, db: Session, *, db_obj: SeasoningRecord, deleted_by: str) -> SeasoningRecord:
        db_obj.is_deleted = True
        db_obj.updated_by = deleted_by
        db.commit()
        return db_obj


# ---------------------------------------------------------------------------
# 포장 실적 CRUD
# ---------------------------------------------------------------------------

class CRUDPackagingRecord:
    """포장 실적 CRUD."""

    def create(self, db: Session, *, obj_in: PackagingRecordCreate, created_by: str) -> PackagingRecord:
        packaging_result, defect_rate = _compute_packaging_result(
            obj_in.metal_detect_result,
            obj_in.total_packages,
            obj_in.defect_packages,
            obj_in.target_weight,
            obj_in.actual_weight_avg,
            obj_in.weight_tolerance,
        )

        db_obj = PackagingRecord(
            work_order_id=obj_in.work_order_id,
            target_weight=obj_in.target_weight,
            actual_weight_avg=obj_in.actual_weight_avg,
            weight_tolerance=obj_in.weight_tolerance,
            total_packages=obj_in.total_packages,
            defect_packages=obj_in.defect_packages,
            metal_detect_result=obj_in.metal_detect_result,
            seal_quality=obj_in.seal_quality,
            label_check=obj_in.label_check,
            expiry_date_set=obj_in.expiry_date_set,
            lot_no=obj_in.lot_no,
            packaging_result=packaging_result,
            defect_rate=defect_rate,
            recorded_by=obj_in.recorded_by or created_by,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)

        if obj_in.total_packages:
            wo = db.get(WorkOrder, obj_in.work_order_id)
            if wo:
                wo.actual_qty = obj_in.total_packages
                wo.defect_qty = obj_in.defect_packages

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: PackagingRecord, obj_in: PackagingRecordUpdate, updated_by: str) -> PackagingRecord:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        packaging_result, defect_rate = _compute_packaging_result(
            db_obj.metal_detect_result,
            db_obj.total_packages,
            db_obj.defect_packages,
            db_obj.target_weight,
            db_obj.actual_weight_avg,
            float(db_obj.weight_tolerance),
        )
        db_obj.packaging_result = packaging_result
        db_obj.defect_rate = defect_rate
        db_obj.updated_by = updated_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, record_id: int) -> Optional[PackagingRecord]:
        return db.query(PackagingRecord).filter(
            PackagingRecord.id == record_id,
            PackagingRecord.is_deleted == False,  # noqa: E712
        ).first()

    def get_by_work_order(self, db: Session, work_order_id: int) -> list[PackagingRecord]:
        return db.query(PackagingRecord).filter(
            PackagingRecord.work_order_id == work_order_id,
            PackagingRecord.is_deleted == False,  # noqa: E712
        ).order_by(PackagingRecord.recorded_at.desc()).all()

    def soft_delete(self, db: Session, *, db_obj: PackagingRecord, deleted_by: str) -> PackagingRecord:
        db_obj.is_deleted = True
        db_obj.updated_by = deleted_by
        db.commit()
        return db_obj


# ---------------------------------------------------------------------------
# 입고전처리 실적 CRUD
# ---------------------------------------------------------------------------

class CRUDPreprocessRecord:
    """입고전처리 실적 CRUD."""

    def create(self, db: Session, *, obj_in: PreprocessRecordCreate, created_by: str) -> PreprocessRecord:
        pass_weight = round(obj_in.input_weight - obj_in.reject_weight, 2)

        db_obj = PreprocessRecord(
            work_order_id=obj_in.work_order_id,
            raw_material_id=obj_in.raw_material_id,
            receive_date=obj_in.receive_date,
            input_weight=obj_in.input_weight,
            reject_weight=obj_in.reject_weight,
            pass_weight=pass_weight,
            storage_temp=obj_in.storage_temp,
            foreign_matter_removed=obj_in.foreign_matter_removed,
            pre_wash_done=obj_in.pre_wash_done,
            reject_reason=obj_in.reject_reason,
            recorded_by=obj_in.recorded_by or created_by,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: PreprocessRecord, obj_in: PreprocessRecordUpdate, updated_by: str) -> PreprocessRecord:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db_obj.pass_weight = round(float(db_obj.input_weight) - float(db_obj.reject_weight), 2)
        db_obj.updated_by = updated_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, record_id: int) -> Optional[PreprocessRecord]:
        return db.query(PreprocessRecord).filter(
            PreprocessRecord.id == record_id,
            PreprocessRecord.is_deleted == False,  # noqa: E712
        ).first()

    def get_multi(
        self,
        db: Session,
        *,
        raw_material_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[PreprocessRecord], int]:
        q = db.query(PreprocessRecord).filter(PreprocessRecord.is_deleted == False)  # noqa: E712
        if raw_material_id:
            q = q.filter(PreprocessRecord.raw_material_id == raw_material_id)
        if date_from:
            q = q.filter(PreprocessRecord.receive_date >= date_from)
        if date_to:
            q = q.filter(PreprocessRecord.receive_date <= date_to)
        total = q.count()
        records = q.order_by(PreprocessRecord.receive_date.desc()).offset(skip).limit(limit).all()
        return records, total

    def soft_delete(self, db: Session, *, db_obj: PreprocessRecord, deleted_by: str) -> PreprocessRecord:
        db_obj.is_deleted = True
        db_obj.updated_by = deleted_by
        db.commit()
        return db_obj


# ---------------------------------------------------------------------------
# 공정별 실적 집계 및 CCP 이탈 조회
# ---------------------------------------------------------------------------

class CRUDProcessSummary:
    """공정 실적 집계 및 CCP 이탈 현황."""

    def get_process_summary(
        self,
        db: Session,
        *,
        date_from: date,
        date_to: date,
        process_type: Optional[str] = None,
    ) -> list[dict]:
        """일별 공정실적 집계: 투입량, 산출량, 수율, CCP 이탈건수."""
        results = []

        process_map = {
            "WASHING": (WashRecord, "wash_water_temp", "wash_water_ph", "wash_result"),
            "SALTING": (SaltingRecord, "brine_concentration", "salinity_result", "salting_result"),
            "SEASONING": (SeasoningRecord, "mix_temperature", None, "seasoning_result"),
            "PACKAGING": (PackagingRecord, "metal_detect_result", None, "packaging_result"),
        }

        targets = (
            {process_type: process_map[process_type]}
            if process_type and process_type in process_map
            else process_map
        )

        for ptype, (model, *_) in targets.items():
            rows = (
                db.query(
                    func.date(model.recorded_at).label("record_date"),
                    func.count(model.id).label("cnt"),
                    func.sum(model.input_weight).label("total_input"),
                    func.sum(model.output_weight).label("total_output"),
                )
                .filter(
                    model.is_deleted == False,  # noqa: E712
                    func.date(model.recorded_at) >= date_from,
                    func.date(model.recorded_at) <= date_to,
                )
                .group_by(func.date(model.recorded_at))
                .all()
            )

            for row in rows:
                avg_yield = None
                if row.total_input and row.total_output and row.total_input > 0:
                    avg_yield = round(float(row.total_output) / float(row.total_input) * 100, 2)

                # CCP 이탈건수: result != PASS
                fail_result_col = getattr(model, _[-1])
                fail_count = (
                    db.query(func.count(model.id))
                    .filter(
                        model.is_deleted == False,  # noqa: E712
                        func.date(model.recorded_at) == row.record_date,
                        fail_result_col != "PASS",
                    )
                    .scalar()
                    or 0
                )

                results.append({
                    "process_type": ptype,
                    "record_date": row.record_date,
                    "record_count": row.cnt,
                    "total_input_weight": float(row.total_input) if row.total_input else None,
                    "total_output_weight": float(row.total_output) if row.total_output else None,
                    "avg_yield_rate": avg_yield,
                    "ccp_violation_count": fail_count,
                })

        results.sort(key=lambda x: (x["record_date"], x["process_type"]))
        return results

    def get_ccp_violations(
        self,
        db: Session,
        *,
        date_from: date,
        date_to: date,
    ) -> list[dict]:
        """CCP 이탈 현황 조회."""
        violations: list[dict] = []

        # 세척: 온도 이탈
        wash_temp = (
            db.query(WashRecord)
            .filter(
                WashRecord.is_deleted == False,  # noqa: E712
                func.date(WashRecord.recorded_at) >= date_from,
                func.date(WashRecord.recorded_at) <= date_to,
                WashRecord.wash_water_temp.isnot(None),
                ~and_(WashRecord.wash_water_temp >= 1.0, WashRecord.wash_water_temp <= 15.0),
            )
            .all()
        )
        for r in wash_temp:
            violations.append({
                "process_type": "WASHING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "wash_water_temp",
                "measured_value": float(r.wash_water_temp),
                "ccp_min": 1.0,
                "ccp_max": 15.0,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        # 세척: pH 이탈
        wash_ph = (
            db.query(WashRecord)
            .filter(
                WashRecord.is_deleted == False,  # noqa: E712
                func.date(WashRecord.recorded_at) >= date_from,
                func.date(WashRecord.recorded_at) <= date_to,
                WashRecord.wash_water_ph.isnot(None),
                ~and_(WashRecord.wash_water_ph >= 6.5, WashRecord.wash_water_ph <= 8.5),
            )
            .all()
        )
        for r in wash_ph:
            violations.append({
                "process_type": "WASHING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "wash_water_ph",
                "measured_value": float(r.wash_water_ph),
                "ccp_min": 6.5,
                "ccp_max": 8.5,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        # 절임: 염수농도 이탈
        salt_conc = (
            db.query(SaltingRecord)
            .filter(
                SaltingRecord.is_deleted == False,  # noqa: E712
                func.date(SaltingRecord.recorded_at) >= date_from,
                func.date(SaltingRecord.recorded_at) <= date_to,
                SaltingRecord.brine_concentration.isnot(None),
                ~and_(SaltingRecord.brine_concentration >= 15.0, SaltingRecord.brine_concentration <= 20.0),
            )
            .all()
        )
        for r in salt_conc:
            violations.append({
                "process_type": "SALTING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "brine_concentration",
                "measured_value": float(r.brine_concentration),
                "ccp_min": 15.0,
                "ccp_max": 20.0,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        # 절임: 염도 이탈
        salt_salinity = (
            db.query(SaltingRecord)
            .filter(
                SaltingRecord.is_deleted == False,  # noqa: E712
                func.date(SaltingRecord.recorded_at) >= date_from,
                func.date(SaltingRecord.recorded_at) <= date_to,
                SaltingRecord.salinity_result.isnot(None),
                ~and_(SaltingRecord.salinity_result >= 2.5, SaltingRecord.salinity_result <= 3.0),
            )
            .all()
        )
        for r in salt_salinity:
            violations.append({
                "process_type": "SALTING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "salinity_result",
                "measured_value": float(r.salinity_result),
                "ccp_min": 2.5,
                "ccp_max": 3.0,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        # 양념: 혼합온도 이탈
        season_temp = (
            db.query(SeasoningRecord)
            .filter(
                SeasoningRecord.is_deleted == False,  # noqa: E712
                func.date(SeasoningRecord.recorded_at) >= date_from,
                func.date(SeasoningRecord.recorded_at) <= date_to,
                SeasoningRecord.mix_temperature.isnot(None),
                ~and_(SeasoningRecord.mix_temperature >= -2.0, SeasoningRecord.mix_temperature <= 10.0),
            )
            .all()
        )
        for r in season_temp:
            violations.append({
                "process_type": "SEASONING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "mix_temperature",
                "measured_value": float(r.mix_temperature),
                "ccp_min": -2.0,
                "ccp_max": 10.0,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        # 포장: 금속검출 FAIL
        pack_metal = (
            db.query(PackagingRecord)
            .filter(
                PackagingRecord.is_deleted == False,  # noqa: E712
                func.date(PackagingRecord.recorded_at) >= date_from,
                func.date(PackagingRecord.recorded_at) <= date_to,
                PackagingRecord.metal_detect_result == "FAIL",
            )
            .all()
        )
        for r in pack_metal:
            violations.append({
                "process_type": "PACKAGING",
                "record_id": r.id,
                "work_order_id": r.work_order_id,
                "work_order_no": r.work_order.work_order_no if r.work_order else None,
                "violation_field": "metal_detect_result",
                "measured_value": None,
                "ccp_min": None,
                "ccp_max": None,
                "recorded_at": r.recorded_at,
                "recorded_by": r.recorded_by,
            })

        violations.sort(key=lambda x: x["recorded_at"], reverse=True)
        return violations


# 싱글턴 인스턴스
crud_wash = CRUDWashRecord()
crud_salting = CRUDSaltingRecord()
crud_seasoning = CRUDSeasoningRecord()
crud_packaging = CRUDPackagingRecord()
crud_preprocess = CRUDPreprocessRecord()
crud_process_summary = CRUDProcessSummary()
