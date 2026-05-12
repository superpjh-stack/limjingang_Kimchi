"""설비 확장(점검·고장) CRUD 모듈."""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.equipment import Equipment
from app.models.equipment_ext import EquipmentFailure, EquipmentInspection
from app.schemas.equipment_ext import (
    FailureCreate,
    FailureUpdate,
    InspectionCreate,
    InspectionUpdate,
)


# ============================================================
# 점검 CRUD
# ============================================================

class CRUDEquipmentInspection(
    CRUDBase[EquipmentInspection, InspectionCreate, InspectionUpdate]
):
    """설비 점검 CRUD 클래스."""

    def get_by_equipment(
        self,
        db: Session,
        *,
        equipment_id: int,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[EquipmentInspection], int]:
        """설비별 점검 이력을 조회합니다.

        Args:
            db: 데이터베이스 세션
            equipment_id: 설비 ID
            status: 상태 필터 (선택)
            skip: 오프셋
            limit: 최대 반환 수

        Returns:
            (점검 목록, 전체 개수) 튜플
        """
        query = db.query(EquipmentInspection).filter(
            EquipmentInspection.equipment_id == equipment_id,
            EquipmentInspection.is_deleted == False,
        )
        if status:
            query = query.filter(EquipmentInspection.status == status)

        total = query.count()
        items = (
            query.order_by(EquipmentInspection.scheduled_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_overdue(self, db: Session) -> List[EquipmentInspection]:
        """기간이 초과된 미완료 점검 목록을 반환합니다.

        scheduled_date < 오늘 이고 status = SCHEDULED 인 점검.

        Args:
            db: 데이터베이스 세션

        Returns:
            미완료(지연) 점검 목록
        """
        today = date.today()
        return (
            db.query(EquipmentInspection)
            .filter(
                EquipmentInspection.is_deleted == False,
                EquipmentInspection.status == "SCHEDULED",
                EquipmentInspection.scheduled_date < today,
            )
            .order_by(EquipmentInspection.scheduled_date)
            .all()
        )

    def get_upcoming(self, db: Session, days: int = 7) -> List[EquipmentInspection]:
        """N일 이내 예정 점검 목록을 반환합니다.

        Args:
            db: 데이터베이스 세션
            days: 조회 기간 (기본 7일)

        Returns:
            upcoming 점검 목록
        """
        from datetime import timedelta

        today = date.today()
        cutoff = today + timedelta(days=days)
        return (
            db.query(EquipmentInspection)
            .filter(
                EquipmentInspection.is_deleted == False,
                EquipmentInspection.status == "SCHEDULED",
                EquipmentInspection.scheduled_date >= today,
                EquipmentInspection.scheduled_date <= cutoff,
            )
            .order_by(EquipmentInspection.scheduled_date)
            .all()
        )

    def complete_inspection(
        self,
        db: Session,
        *,
        inspection_id: int,
        result: str,
        findings: Optional[str],
        actions_taken: Optional[str],
        next_scheduled_date: Optional[date],
        actual_date: Optional[date],
        inspector: Optional[str],
        updated_by: str,
    ) -> Optional[EquipmentInspection]:
        """점검을 완료 처리합니다.

        Args:
            db: 데이터베이스 세션
            inspection_id: 점검 ID
            result: 결과 (PASS/FAIL/CONDITIONAL)
            findings: 발견사항
            actions_taken: 조치 내용
            next_scheduled_date: 다음 점검 예정일
            actual_date: 실제 점검일
            inspector: 점검자
            updated_by: 수정자

        Returns:
            수정된 점검 객체 또는 None
        """
        insp = self.get(db, id=inspection_id)
        if not insp:
            return None

        insp.status = "COMPLETED"
        insp.result = result
        insp.actual_date = actual_date or date.today()
        if findings is not None:
            insp.findings = findings
        if actions_taken is not None:
            insp.actions_taken = actions_taken
        if next_scheduled_date is not None:
            insp.next_scheduled_date = next_scheduled_date
        if inspector is not None:
            insp.inspector = inspector
        insp.updated_by = updated_by

        db.add(insp)
        db.commit()
        db.refresh(insp)
        return insp


crud_inspection = CRUDEquipmentInspection(EquipmentInspection)


# ============================================================
# 고장 CRUD
# ============================================================

class CRUDEquipmentFailure(
    CRUDBase[EquipmentFailure, FailureCreate, FailureUpdate]
):
    """설비 고장 CRUD 클래스."""

    def _generate_failure_no(self, db: Session, failure_date: datetime) -> str:
        """고장 번호를 자동 생성합니다. (FL-YYYYMMDD-NNN)

        Args:
            db: 데이터베이스 세션
            failure_date: 고장 발생일시

        Returns:
            생성된 고장 번호 문자열
        """
        date_str = failure_date.strftime("%Y%m%d")
        prefix = f"FL-{date_str}-"

        count = (
            db.query(EquipmentFailure)
            .filter(EquipmentFailure.failure_no.like(f"{prefix}%"))
            .count()
        )
        seq = count + 1
        return f"{prefix}{seq:03d}"

    def create_with_no(
        self,
        db: Session,
        *,
        obj_in: FailureCreate,
        created_by: str = "system",
    ) -> EquipmentFailure:
        """고장 번호를 자동 생성하여 고장을 등록합니다.

        등록 시 해당 설비의 status를 BREAKDOWN으로 변경합니다.

        Args:
            db: 데이터베이스 세션
            obj_in: 고장 등록 스키마
            created_by: 생성자

        Returns:
            생성된 고장 객체
        """
        failure_no = self._generate_failure_no(db, obj_in.failure_date)

        db_obj = EquipmentFailure(
            equipment_id=obj_in.equipment_id,
            failure_no=failure_no,
            failure_date=obj_in.failure_date,
            failure_type=obj_in.failure_type,
            symptoms=obj_in.symptoms,
            cause=obj_in.cause,
            impact_level=obj_in.impact_level,
            status="OPEN",
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)

        # 설비 상태 → BREAKDOWN
        equipment = db.query(Equipment).filter(Equipment.id == obj_in.equipment_id).first()
        if equipment:
            equipment.status = "BREAKDOWN"
            equipment.updated_by = created_by
            db.add(equipment)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_equipment(
        self,
        db: Session,
        *,
        equipment_id: int,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[EquipmentFailure], int]:
        """설비별 고장 이력을 조회합니다.

        Args:
            db: 데이터베이스 세션
            equipment_id: 설비 ID
            status: 상태 필터 (선택)
            skip: 오프셋
            limit: 최대 반환 수

        Returns:
            (고장 목록, 전체 개수) 튜플
        """
        query = db.query(EquipmentFailure).filter(
            EquipmentFailure.equipment_id == equipment_id,
            EquipmentFailure.is_deleted == False,
        )
        if status:
            query = query.filter(EquipmentFailure.status == status)

        total = query.count()
        items = (
            query.order_by(EquipmentFailure.failure_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def resolve_failure(
        self,
        db: Session,
        *,
        failure_id: int,
        repair_notes: str,
        downtime_hours: Decimal,
        repaired_by: str,
        updated_by: str,
    ) -> Optional[EquipmentFailure]:
        """고장을 복구 완료 처리합니다.

        고장 상태를 RESOLVED로 변경하고 해당 설비의 status를 IDLE로 복구합니다.

        Args:
            db: 데이터베이스 세션
            failure_id: 고장 ID
            repair_notes: 수리 내용
            downtime_hours: 가동중지 시간
            repaired_by: 수리 담당자
            updated_by: 수정자

        Returns:
            수정된 고장 객체 또는 None
        """
        failure = self.get(db, id=failure_id)
        if not failure:
            return None

        failure.status = "RESOLVED"
        failure.resolved_date = datetime.now(timezone.utc)
        failure.repair_notes = repair_notes
        failure.downtime_hours = downtime_hours
        failure.repaired_by = repaired_by
        failure.updated_by = updated_by
        db.add(failure)

        # 설비 상태 → IDLE
        equipment = (
            db.query(Equipment)
            .filter(Equipment.id == failure.equipment_id)
            .first()
        )
        if equipment:
            equipment.status = "IDLE"
            equipment.updated_by = updated_by
            db.add(equipment)

        db.commit()
        db.refresh(failure)
        return failure

    def get_open_failures(self, db: Session) -> List[EquipmentFailure]:
        """미해결 고장 목록을 반환합니다 (OPEN 또는 IN_REPAIR).

        Args:
            db: 데이터베이스 세션

        Returns:
            미해결 고장 목록
        """
        return (
            db.query(EquipmentFailure)
            .filter(
                EquipmentFailure.is_deleted == False,
                EquipmentFailure.status.in_(["OPEN", "IN_REPAIR"]),
            )
            .order_by(EquipmentFailure.failure_date.desc())
            .all()
        )


crud_failure = CRUDEquipmentFailure(EquipmentFailure)
