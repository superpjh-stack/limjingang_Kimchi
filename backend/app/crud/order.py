"""수주 CRUD 모듈.

수주 헤더·상세 트랜잭션, 상태 변경, 이력 기록 기능을 제공합니다.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.crud.base import CRUDBase
from app.models.order import Order, OrderDetail, OrderHistory
from app.schemas.order import OrderCreate, OrderUpdate


def _generate_order_no(db: Session) -> str:
    """당일 최대 수주번호 + 1로 새 수주번호를 생성합니다.

    형식: ORD-YYYYMMDD-NNN
    """
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"ORD-{today}-"
    last = (
        db.query(Order)
        .filter(Order.order_no.like(f"{prefix}%"))
        .order_by(Order.order_no.desc())
        .first()
    )
    if last:
        seq = int(last.order_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:03d}"


class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):
    """수주 CRUD 클래스."""

    def create_with_details(
        self,
        db: Session,
        *,
        obj_in: OrderCreate,
        created_by: str,
    ) -> Order:
        """헤더+상세를 하나의 트랜잭션으로 생성합니다.

        - order_no 자동 생성 (ORD-YYYYMMDD-NNN)
        - 상세별 amount(= qty * unit_price) 자동 계산
        - 헤더의 total_qty / total_amount 집계
        """
        order_no = _generate_order_no(db)

        # 헤더 생성
        db_order = Order(
            order_no=order_no,
            customer_id=obj_in.customer_id,
            order_date=obj_in.order_date,
            delivery_date=obj_in.delivery_date,
            order_type=obj_in.order_type,
            delivery_address=obj_in.delivery_address,
            remark=obj_in.remark,
            status="DRAFT",
            total_qty=0,
            total_amount=0,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_order)
        db.flush()  # id 확보

        total_qty = 0
        total_amount = 0

        for detail_in in obj_in.details:
            amount = detail_in.order_qty * detail_in.unit_price
            db_detail = OrderDetail(
                order_id=db_order.id,
                product_id=detail_in.product_id,
                order_qty=detail_in.order_qty,
                unit_price=detail_in.unit_price,
                amount=amount,
                delivery_date=detail_in.delivery_date,
                notes=detail_in.notes,
                status="PENDING",
                shipped_qty=0,
                created_by=created_by,
                updated_by=created_by,
            )
            db.add(db_detail)
            total_qty += detail_in.order_qty
            total_amount += amount

        db_order.total_qty = total_qty
        db_order.total_amount = total_amount
        db.commit()
        db.refresh(db_order)
        return db_order

    def get_with_details(self, db: Session, id: int) -> Optional[Order]:
        """details, customer 관계를 포함하여 수주를 조회합니다."""
        return (
            db.query(Order)
            .options(
                joinedload(Order.details).joinedload(OrderDetail.product),
                joinedload(Order.customer),
            )
            .filter(Order.id == id, Order.is_deleted == False)
            .first()
        )

    def get_multi_with_filter(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[int] = None,
        status: Optional[str] = None,
        order_date_from: Optional[datetime] = None,
        order_date_to: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> tuple[List[Order], int]:
        """필터/검색 조건으로 수주 목록을 조회합니다.

        search: order_no 또는 고객명(Customer.customer_name) 부분 일치
        """
        from app.models.customer import Customer

        query = (
            db.query(Order)
            .join(Order.customer)
            .options(
                joinedload(Order.customer),
                joinedload(Order.details).joinedload(OrderDetail.product),
            )
            .filter(Order.is_deleted == False)
        )

        if customer_id is not None:
            query = query.filter(Order.customer_id == customer_id)
        if status:
            query = query.filter(Order.status == status)
        if order_date_from:
            query = query.filter(Order.order_date >= order_date_from)
        if order_date_to:
            query = query.filter(Order.order_date <= order_date_to)
        if search:
            query = query.filter(
                or_(
                    Order.order_no.like(f"%{search}%"),
                    Customer.customer_name.like(f"%{search}%"),
                )
            )

        total = query.count()
        items = query.order_by(Order.order_no.desc()).offset(skip).limit(limit).all()
        return items, total

    def update_status(
        self,
        db: Session,
        *,
        order_id: int,
        new_status: str,
        reason: Optional[str] = None,
        updated_by: str,
    ) -> Optional[Order]:
        """수주 상태를 변경하고 변경 이력(TB_ORDER_HISTORY)을 기록합니다."""
        order = self.get(db, id=order_id)
        if not order:
            return None

        old_status = order.status
        order.status = new_status
        order.updated_by = updated_by

        history = OrderHistory(
            order_id=order_id,
            changed_field="status",
            old_value=old_status,
            new_value=new_status,
            change_reason=reason,
            changed_by=updated_by,
        )
        db.add(history)
        db.commit()
        db.refresh(order)
        return order

    def confirm_order(
        self,
        db: Session,
        *,
        order_id: int,
        confirmed_by: str,
    ) -> Optional[Order]:
        """수주를 확정합니다 (DRAFT → CONFIRMED).

        confirmed_at, confirmed_by를 기록하고 상태 이력을 남깁니다.
        """
        order = self.get(db, id=order_id)
        if not order:
            return None

        old_status = order.status
        order.status = "CONFIRMED"
        order.confirmed_at = datetime.now(timezone.utc)
        order.confirmed_by = confirmed_by
        order.updated_by = confirmed_by

        history = OrderHistory(
            order_id=order_id,
            changed_field="status",
            old_value=old_status,
            new_value="CONFIRMED",
            change_reason="수주 확정",
            changed_by=confirmed_by,
        )
        db.add(history)
        db.commit()
        db.refresh(order)
        return order

    def get_history(self, db: Session, order_id: int) -> List[OrderHistory]:
        """수주 변경 이력을 시간 순으로 조회합니다."""
        return (
            db.query(OrderHistory)
            .filter(OrderHistory.order_id == order_id)
            .order_by(OrderHistory.changed_at.asc())
            .all()
        )


crud_order = CRUDOrder(Order)
