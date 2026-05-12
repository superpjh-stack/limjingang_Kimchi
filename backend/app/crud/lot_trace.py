"""LOT 추적 이력 CRUD 모듈."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.lot_trace import LotTrace
from app.schemas.lot_trace import LotTraceCreate


class CRUDLotTrace:
    """LOT 추적 이력 CRUD 클래스."""

    def create(self, db: Session, *, data: LotTraceCreate, created_by: str) -> LotTrace:
        """LOT 이력을 생성합니다.

        Args:
            db: 데이터베이스 세션
            data: 생성 스키마
            created_by: 생성자

        Returns:
            생성된 LOT 이력 객체
        """
        obj = LotTrace(
            lot_no=data.lot_no,
            trace_type=data.trace_type,
            trace_date=data.trace_date,
            ref_table=data.ref_table,
            ref_id=data.ref_id,
            product_id=data.product_id,
            raw_material_id=data.raw_material_id,
            work_order_id=data.work_order_id,
            quantity=data.quantity,
            unit=data.unit,
            warehouse_id=data.warehouse_id,
            process_name=data.process_name,
            description=data.description,
            operator=data.operator,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def get_by_lot_no(self, db: Session, *, lot_no: str) -> list[LotTrace]:
        """LOT 번호로 전체 이력을 조회합니다 (trace_date 오름차순).

        Args:
            db: 데이터베이스 세션
            lot_no: LOT 번호

        Returns:
            이력 목록
        """
        return (
            db.query(LotTrace)
            .filter(
                LotTrace.lot_no == lot_no,
                LotTrace.is_deleted == False,
            )
            .order_by(LotTrace.trace_date.asc())
            .all()
        )

    def search(
        self,
        db: Session,
        *,
        lot_no: Optional[str] = None,
        trace_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[LotTrace], int]:
        """이력을 필터 조건으로 검색합니다.

        Args:
            db: 데이터베이스 세션
            lot_no: LOT 번호 (부분 일치)
            trace_type: 이력 유형
            date_from: 시작 일시
            date_to: 종료 일시
            skip: 오프셋
            limit: 최대 반환 수

        Returns:
            (이력 목록, 전체 개수) 튜플
        """
        query = db.query(LotTrace).filter(LotTrace.is_deleted == False)

        if lot_no:
            query = query.filter(LotTrace.lot_no.like(f"%{lot_no}%"))
        if trace_type:
            query = query.filter(LotTrace.trace_type == trace_type)
        if date_from:
            query = query.filter(LotTrace.trace_date >= date_from)
        if date_to:
            query = query.filter(LotTrace.trace_date <= date_to)

        total = query.count()
        items = (
            query.order_by(LotTrace.trace_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_timeline(self, db: Session, *, lot_no: str) -> dict:
        """LOT 번호의 타임라인과 요약 정보를 반환합니다.

        Args:
            db: 데이터베이스 세션
            lot_no: LOT 번호

        Returns:
            {lot_no, timeline, summary} 딕셔너리
        """
        traces = self.get_by_lot_no(db, lot_no=lot_no)
        return {
            "lot_no": lot_no,
            "timeline": traces,
            "summary": {
                "total_events": len(traces),
                "first_event": traces[0].trace_date if traces else None,
                "last_event": traces[-1].trace_date if traces else None,
                "trace_types": list({t.trace_type for t in traces}),
            },
        }


crud_lot_trace = CRUDLotTrace()
