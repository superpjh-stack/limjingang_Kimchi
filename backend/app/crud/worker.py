"""작업자 CRUD 모듈."""

from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.worker import Worker
from app.schemas.worker import WorkerCreate, WorkerUpdate


class CRUDWorker(CRUDBase[Worker, WorkerCreate, WorkerUpdate]):
    """작업자 CRUD."""

    def get_multi_with_filter(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        department: Optional[str] = None,
        shift: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Worker], int]:
        """필터링된 작업자 목록 조회."""
        query = db.query(Worker).filter(Worker.is_deleted == False)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Worker.name.ilike(like), Worker.emp_no.ilike(like)))
        if department:
            query = query.filter(Worker.department == department)
        if shift:
            query = query.filter(Worker.shift == shift)
        if status:
            query = query.filter(Worker.status == status)
        total = query.count()
        items = query.order_by(Worker.emp_no.asc()).offset(skip).limit(limit).all()
        return items, total

    def get_by_emp_no(self, db: Session, *, emp_no: str) -> Optional[Worker]:
        """사원번호로 조회."""
        return (
            db.query(Worker)
            .filter(Worker.emp_no == emp_no, Worker.is_deleted == False)
            .first()
        )


crud_worker = CRUDWorker(Worker)
