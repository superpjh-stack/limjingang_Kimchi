"""생산계획 및 작업지시 CRUD 모듈.

생산계획 생성, 작업지시 자동 생성, 상태 변경, 작업실적 기록 기능을 제공합니다.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.crud.base import CRUDBase
from app.models.production import (
    ProductionPlan,
    QCRecord,
    WorkOrder,
    WorkOrderResult,
)
from app.schemas.production import (
    ProductionPlanCreate,
    ProductionPlanUpdate,
    QCRecordCreate,
    WorkOrderCreate,
    WorkOrderResultCreate,
    WorkOrderUpdate,
)


# ---------------------------------------------------------------------------
# 번호 자동 생성 유틸
# ---------------------------------------------------------------------------

def _generate_plan_no(db: Session) -> str:
    """당일 최대 계획번호 + 1로 생산계획번호를 생성합니다.

    형식: PLAN-YYYYMMDD-NNN
    """
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"PLAN-{today}-"
    last = (
        db.query(ProductionPlan)
        .filter(ProductionPlan.plan_no.like(f"{prefix}%"))
        .order_by(ProductionPlan.plan_no.desc())
        .first()
    )
    seq = int(last.plan_no.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _generate_work_order_no(db: Session) -> str:
    """당일 최대 작업지시번호 + 1로 작업지시번호를 생성합니다.

    형식: WO-YYYYMMDD-NNN
    """
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"WO-{today}-"
    last = (
        db.query(WorkOrder)
        .filter(WorkOrder.work_order_no.like(f"{prefix}%"))
        .order_by(WorkOrder.work_order_no.desc())
        .first()
    )
    seq = int(last.work_order_no.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


# ---------------------------------------------------------------------------
# 생산계획 CRUD
# ---------------------------------------------------------------------------

class CRUDProductionPlan(CRUDBase[ProductionPlan, ProductionPlanCreate, ProductionPlanUpdate]):
    """생산계획 CRUD 클래스."""

    def create(
        self,
        db: Session,
        *,
        obj_in: ProductionPlanCreate,
        created_by: str = "system",
    ) -> ProductionPlan:
        """plan_no 자동 생성과 함께 생산계획을 생성합니다."""
        plan_no = _generate_plan_no(db)
        db_plan = ProductionPlan(
            plan_no=plan_no,
            plan_date=obj_in.plan_date,
            order_id=obj_in.order_id,
            product_id=obj_in.product_id,
            bom_id=obj_in.bom_id,
            planned_qty=obj_in.planned_qty,
            actual_qty=0,
            status="DRAFT",
            plan_type=obj_in.plan_type,
            start_datetime=obj_in.start_datetime,
            end_datetime=obj_in.end_datetime,
            remark=obj_in.remark,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
        return db_plan

    def get_with_relations(self, db: Session, id: int) -> Optional[ProductionPlan]:
        """연관 관계를 모두 로드하여 생산계획을 조회합니다."""
        return (
            db.query(ProductionPlan)
            .options(
                joinedload(ProductionPlan.product),
                joinedload(ProductionPlan.bom),
                joinedload(ProductionPlan.order),
                joinedload(ProductionPlan.work_orders),
            )
            .filter(ProductionPlan.id == id, ProductionPlan.is_deleted == False)
            .first()
        )

    def get_multi_with_filter(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        plan_date_from: Optional[datetime] = None,
        plan_date_to: Optional[datetime] = None,
        product_id: Optional[int] = None,
    ) -> tuple[List[ProductionPlan], int]:
        """필터 조건으로 생산계획 목록을 조회합니다."""
        query = (
            db.query(ProductionPlan)
            .options(
                joinedload(ProductionPlan.product),
                joinedload(ProductionPlan.order),
            )
            .filter(ProductionPlan.is_deleted == False)
        )
        if status:
            query = query.filter(ProductionPlan.status == status)
        if plan_date_from:
            query = query.filter(ProductionPlan.plan_date >= plan_date_from)
        if plan_date_to:
            query = query.filter(ProductionPlan.plan_date <= plan_date_to)
        if product_id:
            query = query.filter(ProductionPlan.product_id == product_id)

        total = query.count()
        items = query.order_by(ProductionPlan.plan_no.desc()).offset(skip).limit(limit).all()
        return items, total

    def confirm_plan(
        self,
        db: Session,
        *,
        plan_id: int,
        updated_by: str,
    ) -> Optional[ProductionPlan]:
        """생산계획을 확정합니다 (DRAFT → CONFIRMED)."""
        plan = self.get(db, id=plan_id)
        if not plan:
            return None
        plan.status = "CONFIRMED"
        plan.updated_by = updated_by
        db.commit()
        db.refresh(plan)
        return plan

    def create_work_orders_from_plan(
        self,
        db: Session,
        *,
        plan_id: int,
        created_by: str,
    ) -> List[WorkOrder]:
        """생산계획에서 공정별 작업지시를 자동 생성합니다.

        - 생산계획에 연결된 제품의 BOM 공정 목록을 조회하여 각 공정별 작업지시 생성
        - 공정 정보가 없으면 단일 작업지시 생성
        """
        from app.models.process import Process

        plan = self.get_with_relations(db, id=plan_id)
        if not plan:
            return []

        # 활성 공정 목록 조회
        processes = (
            db.query(Process)
            .filter(Process.is_deleted == False, Process.is_active == True)
            .order_by(Process.sequence.asc())
            .all()
        )

        work_orders: List[WorkOrder] = []

        if processes:
            for process in processes:
                wo_no = _generate_work_order_no(db)
                db_wo = WorkOrder(
                    work_order_no=wo_no,
                    production_plan_id=plan_id,
                    product_id=plan.product_id,
                    bom_id=plan.bom_id,
                    process_id=process.id,
                    equipment_id=None,
                    assigned_user_id=None,
                    work_date=plan.plan_date,
                    planned_qty=plan.planned_qty,
                    actual_qty=0,
                    defect_qty=0,
                    status="ISSUED",
                    planned_start=plan.start_datetime,
                    planned_end=plan.end_datetime,
                    issued_by=created_by,
                    created_by=created_by,
                    updated_by=created_by,
                )
                db.add(db_wo)
                db.flush()
                work_orders.append(db_wo)
        else:
            # 공정 정보 없는 경우 단일 작업지시 생성
            wo_no = _generate_work_order_no(db)
            db_wo = WorkOrder(
                work_order_no=wo_no,
                production_plan_id=plan_id,
                product_id=plan.product_id,
                bom_id=plan.bom_id,
                work_date=plan.plan_date,
                planned_qty=plan.planned_qty,
                actual_qty=0,
                defect_qty=0,
                status="ISSUED",
                issued_by=created_by,
                created_by=created_by,
                updated_by=created_by,
            )
            db.add(db_wo)
            db.flush()
            work_orders.append(db_wo)

        db.commit()
        for wo in work_orders:
            db.refresh(wo)
        return work_orders


# ---------------------------------------------------------------------------
# 작업지시 CRUD
# ---------------------------------------------------------------------------

class CRUDWorkOrder(CRUDBase[WorkOrder, WorkOrderCreate, WorkOrderUpdate]):
    """작업지시 CRUD 클래스."""

    def create(
        self,
        db: Session,
        *,
        obj_in: WorkOrderCreate,
        created_by: str = "system",
    ) -> WorkOrder:
        """work_order_no 자동 생성과 함께 작업지시를 생성합니다."""
        wo_no = _generate_work_order_no(db)
        db_wo = WorkOrder(
            work_order_no=wo_no,
            production_plan_id=obj_in.production_plan_id,
            product_id=obj_in.product_id,
            bom_id=obj_in.bom_id,
            process_id=obj_in.process_id,
            equipment_id=obj_in.equipment_id,
            assigned_user_id=obj_in.assigned_user_id,
            work_date=obj_in.work_date,
            planned_qty=obj_in.planned_qty,
            actual_qty=0,
            defect_qty=0,
            status="ISSUED",
            planned_start=obj_in.planned_start,
            planned_end=obj_in.planned_end,
            lot_no=obj_in.lot_no,
            remark=obj_in.remark,
            issued_by=created_by,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_wo)
        db.commit()
        db.refresh(db_wo)
        return db_wo

    def get_with_relations(self, db: Session, id: int) -> Optional[WorkOrder]:
        """연관 관계를 모두 로드하여 작업지시를 조회합니다."""
        return (
            db.query(WorkOrder)
            .options(
                joinedload(WorkOrder.product),
                joinedload(WorkOrder.process),
                joinedload(WorkOrder.equipment),
                joinedload(WorkOrder.assigned_user),
                joinedload(WorkOrder.results),
                joinedload(WorkOrder.qc_records),
            )
            .filter(WorkOrder.id == id, WorkOrder.is_deleted == False)
            .first()
        )

    def get_multi_with_filter(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        work_date: Optional[datetime] = None,
        product_id: Optional[int] = None,
        assigned_user_id: Optional[int] = None,
    ) -> tuple[List[WorkOrder], int]:
        """필터 조건으로 작업지시 목록을 조회합니다."""
        query = (
            db.query(WorkOrder)
            .options(
                joinedload(WorkOrder.product),
                joinedload(WorkOrder.process),
                joinedload(WorkOrder.equipment),
                joinedload(WorkOrder.assigned_user),
            )
            .filter(WorkOrder.is_deleted == False)
        )
        if status:
            query = query.filter(WorkOrder.status == status)
        if work_date:
            query = query.filter(
                WorkOrder.work_date >= work_date.replace(hour=0, minute=0, second=0),
                WorkOrder.work_date < work_date.replace(hour=23, minute=59, second=59),
            )
        if product_id:
            query = query.filter(WorkOrder.product_id == product_id)
        if assigned_user_id:
            query = query.filter(WorkOrder.assigned_user_id == assigned_user_id)

        total = query.count()
        items = query.order_by(WorkOrder.work_order_no.desc()).offset(skip).limit(limit).all()
        return items, total

    def update_work_order_status(
        self,
        db: Session,
        *,
        wo_id: int,
        status: str,
        updated_by: str,
    ) -> Optional[WorkOrder]:
        """작업지시 상태를 변경합니다.

        - IN_PROGRESS: start_datetime 자동 기록
        - COMPLETED: end_datetime, completed_at, completed_by 자동 기록
        """
        wo = self.get(db, id=wo_id)
        if not wo:
            return None

        now = datetime.now(timezone.utc)
        wo.status = status
        wo.updated_by = updated_by

        if status == "IN_PROGRESS" and not wo.start_datetime:
            wo.start_datetime = now
        elif status == "COMPLETED":
            if not wo.end_datetime:
                wo.end_datetime = now
            wo.completed_at = now
            wo.completed_by = updated_by

        db.commit()
        db.refresh(wo)
        return wo

    def record_result(
        self,
        db: Session,
        *,
        wo_id: int,
        result_in: WorkOrderResultCreate,
        recorded_by: str,
    ) -> WorkOrderResult:
        """작업실적을 기록하고 WorkOrder.actual_qty를 누적 업데이트합니다."""
        wo = self.get(db, id=wo_id)
        if not wo:
            raise ValueError(f"작업지시 ID {wo_id}를 찾을 수 없습니다.")

        # 순번 계산
        last_result = (
            db.query(WorkOrderResult)
            .filter(WorkOrderResult.work_order_id == wo_id)
            .order_by(WorkOrderResult.result_seq.desc())
            .first()
        )
        next_seq = (last_result.result_seq + 1) if last_result else 1

        db_result = WorkOrderResult(
            work_order_id=wo_id,
            result_seq=next_seq,
            actual_qty=result_in.actual_qty,
            defect_qty=result_in.defect_qty,
            defect_reason=result_in.defect_reason,
            notes=result_in.notes,
            recorded_by=recorded_by,
            created_by=recorded_by,
            updated_by=recorded_by,
        )
        db.add(db_result)

        # WorkOrder 실적 수량 누적 업데이트
        wo.actual_qty = (wo.actual_qty or 0) + result_in.actual_qty
        wo.defect_qty = (wo.defect_qty or 0) + result_in.defect_qty
        wo.updated_by = recorded_by

        db.commit()
        db.refresh(db_result)
        return db_result

    def get_results(self, db: Session, wo_id: int) -> List[WorkOrderResult]:
        """작업지시별 실적 목록을 순번 순으로 조회합니다."""
        return (
            db.query(WorkOrderResult)
            .filter(WorkOrderResult.work_order_id == wo_id)
            .order_by(WorkOrderResult.result_seq.asc())
            .all()
        )

    def create_qc_record(
        self,
        db: Session,
        *,
        wo_id: int,
        qc_in: QCRecordCreate,
        inspected_by: str,
    ) -> QCRecord:
        """작업지시에 QC 검사 결과를 기록합니다."""
        db_qc = QCRecord(
            work_order_id=wo_id,
            process_id=qc_in.process_id,
            ccp_standard_id=qc_in.ccp_standard_id,
            lot_no=qc_in.lot_no,
            measured_value=qc_in.measured_value,
            unit=qc_in.unit,
            is_pass=qc_in.is_pass,
            action_taken=qc_in.action_taken,
            notes=qc_in.notes,
            inspected_by=inspected_by,
            created_by=inspected_by,
            updated_by=inspected_by,
        )
        db.add(db_qc)
        db.commit()
        db.refresh(db_qc)
        return db_qc


crud_production_plan = CRUDProductionPlan(ProductionPlan)
crud_work_order = CRUDWorkOrder(WorkOrder)
