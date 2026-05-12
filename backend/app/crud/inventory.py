"""재고·출하 CRUD 모듈.

원자재 입고, 재고 관리, 출고, 완제품 재고, 출하 처리 기능을 제공합니다.
모든 재고 변경은 단일 트랜잭션 내에서 처리되며 입출고 이력을 자동 기록합니다.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.inventory import (
    MaterialReceive,
    MaterialStock,
    MaterialTransaction,
    ProductStock,
    Shipment,
    ShipmentDetail,
    Warehouse,
)
from app.schemas.inventory import (
    MaterialIssueRequest,
    MaterialReceiveCreate,
    ShipmentCreate,
    WarehouseCreate,
    WarehouseUpdate,
)


# ---------------------------------------------------------------------------
# 번호 자동 생성 유틸
# ---------------------------------------------------------------------------

def _generate_receive_no(db: Session) -> str:
    """당일 입고번호를 자동 생성합니다. 형식: RCV-YYYYMMDD-NNN"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"RCV-{today}-"
    last = (
        db.query(MaterialReceive)
        .filter(MaterialReceive.receive_no.like(f"{prefix}%"))
        .order_by(MaterialReceive.receive_no.desc())
        .first()
    )
    seq = int(last.receive_no.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _generate_shipment_no(db: Session) -> str:
    """당일 출하번호를 자동 생성합니다. 형식: SHP-YYYYMMDD-NNN"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"SHP-{today}-"
    last = (
        db.query(Shipment)
        .filter(Shipment.shipment_no.like(f"{prefix}%"))
        .order_by(Shipment.shipment_no.desc())
        .first()
    )
    seq = int(last.shipment_no.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


# ---------------------------------------------------------------------------
# 창고 CRUD
# ---------------------------------------------------------------------------

class CRUDWarehouse:
    """창고 CRUD."""

    def get(self, db: Session, id: int) -> Optional[Warehouse]:
        return (
            db.query(Warehouse)
            .filter(Warehouse.id == id, Warehouse.is_deleted == False)
            .first()
        )

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        warehouse_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[List[Warehouse], int]:
        query = db.query(Warehouse).filter(Warehouse.is_deleted == False)
        if warehouse_type:
            query = query.filter(Warehouse.warehouse_type == warehouse_type)
        if is_active is not None:
            query = query.filter(Warehouse.is_active == is_active)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(self, db: Session, *, obj_in: WarehouseCreate, created_by: str) -> Warehouse:
        db_obj = Warehouse(
            **obj_in.model_dump(),
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: Warehouse,
        obj_in: WarehouseUpdate,
        updated_by: str,
    ) -> Warehouse:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db_obj.updated_by = updated_by
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_warehouse = CRUDWarehouse()


# ---------------------------------------------------------------------------
# 재고 CRUD
# ---------------------------------------------------------------------------

class CRUDInventory:
    """원자재 입고·재고·출고·완제품 재고 CRUD."""

    # ------------------------------------------------------------------
    # 입고 처리
    # ------------------------------------------------------------------

    def receive_material(
        self,
        db: Session,
        *,
        obj_in: MaterialReceiveCreate,
        created_by: str,
    ) -> MaterialReceive:
        """원자재 입고 처리 (단일 트랜잭션).

        1. TB_MATERIAL_RECEIVE 생성
        2. TB_MATERIAL_STOCK upsert (lot_no 기준, 기존 lot 있으면 current_qty += receive_qty)
        3. TB_MATERIAL_TRANSACTION 기록 (trans_type=IN)
        """
        amount = int(obj_in.receive_qty * obj_in.unit_price)

        # 1) 입고 기록 생성
        receive = MaterialReceive(
            receive_no=_generate_receive_no(db),
            raw_material_id=obj_in.raw_material_id,
            warehouse_id=obj_in.warehouse_id,
            receive_date=obj_in.receive_date,
            receive_qty=obj_in.receive_qty,
            unit_price=obj_in.unit_price,
            amount=amount,
            lot_no=obj_in.lot_no,
            supplier=obj_in.supplier,
            expiry_date=obj_in.expiry_date,
            qc_status="PENDING",
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(receive)

        # 2) 재고 upsert
        stock = (
            db.query(MaterialStock)
            .filter(
                MaterialStock.raw_material_id == obj_in.raw_material_id,
                MaterialStock.warehouse_id == obj_in.warehouse_id,
                MaterialStock.lot_no == obj_in.lot_no,
                MaterialStock.is_deleted == False,
            )
            .first()
        )
        before_qty = float(stock.current_qty) if stock else 0.0
        after_qty = before_qty + float(obj_in.receive_qty)

        if stock:
            stock.current_qty = after_qty
            stock.unit_price = obj_in.unit_price
            stock.updated_by = created_by
        else:
            stock = MaterialStock(
                raw_material_id=obj_in.raw_material_id,
                warehouse_id=obj_in.warehouse_id,
                lot_no=obj_in.lot_no,
                current_qty=obj_in.receive_qty,
                unit_price=obj_in.unit_price,
                receive_date=obj_in.receive_date,
                expiry_date=obj_in.expiry_date,
                supplier=obj_in.supplier,
                created_by=created_by,
                updated_by=created_by,
            )
            db.add(stock)

        # 3) 이력 기록
        txn = MaterialTransaction(
            raw_material_id=obj_in.raw_material_id,
            warehouse_id=obj_in.warehouse_id,
            trans_type="IN",
            trans_date=obj_in.receive_date,
            trans_qty=obj_in.receive_qty,
            before_qty=before_qty,
            after_qty=after_qty,
            unit_price=obj_in.unit_price,
            lot_no=obj_in.lot_no,
            ref_no=None,
            reason="입고",
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(txn)

        db.commit()
        db.refresh(receive)
        return (
            db.query(MaterialReceive)
            .options(
                joinedload(MaterialReceive.raw_material),
                joinedload(MaterialReceive.warehouse),
            )
            .filter(MaterialReceive.id == receive.id)
            .first()
        )

    def get_receive(self, db: Session, id: int) -> Optional[MaterialReceive]:
        return (
            db.query(MaterialReceive)
            .options(
                joinedload(MaterialReceive.raw_material),
                joinedload(MaterialReceive.warehouse),
            )
            .filter(MaterialReceive.id == id, MaterialReceive.is_deleted == False)
            .first()
        )

    def get_receive_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        raw_material_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        qc_status: Optional[str] = None,
    ) -> tuple[List[MaterialReceive], int]:
        query = (
            db.query(MaterialReceive)
            .options(
                joinedload(MaterialReceive.raw_material),
                joinedload(MaterialReceive.warehouse),
            )
            .filter(MaterialReceive.is_deleted == False)
        )
        if raw_material_id:
            query = query.filter(MaterialReceive.raw_material_id == raw_material_id)
        if warehouse_id:
            query = query.filter(MaterialReceive.warehouse_id == warehouse_id)
        if date_from:
            query = query.filter(MaterialReceive.receive_date >= date_from)
        if date_to:
            query = query.filter(MaterialReceive.receive_date <= date_to)
        if qc_status:
            query = query.filter(MaterialReceive.qc_status == qc_status)
        total = query.count()
        items = query.order_by(MaterialReceive.receive_date.desc()).offset(skip).limit(limit).all()
        return items, total

    def update_qc_status(
        self,
        db: Session,
        *,
        receive_id: int,
        qc_status: str,
        qc_notes: Optional[str],
        updated_by: str,
    ) -> Optional[MaterialReceive]:
        receive = self.get_receive(db, receive_id)
        if not receive:
            return None
        receive.qc_status = qc_status
        if qc_notes is not None:
            receive.qc_notes = qc_notes
        receive.updated_by = updated_by
        db.add(receive)
        db.commit()
        db.refresh(receive)
        return receive

    # ------------------------------------------------------------------
    # 원자재 재고 조회
    # ------------------------------------------------------------------

    def get_material_stock_detail(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 50,
        raw_material_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> tuple[List[MaterialStock], int]:
        query = (
            db.query(MaterialStock)
            .options(
                joinedload(MaterialStock.raw_material),
                joinedload(MaterialStock.warehouse),
            )
            .filter(MaterialStock.is_deleted == False, MaterialStock.current_qty > 0)
        )
        if raw_material_id:
            query = query.filter(MaterialStock.raw_material_id == raw_material_id)
        if warehouse_id:
            query = query.filter(MaterialStock.warehouse_id == warehouse_id)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_material_stock_summary(
        self,
        db: Session,
        raw_material_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> List[dict]:
        """자재별 총 재고 집계. 유통기한 30일 이내 경고 포함."""
        query = (
            db.query(MaterialStock)
            .options(
                joinedload(MaterialStock.raw_material),
                joinedload(MaterialStock.warehouse),
            )
            .filter(MaterialStock.is_deleted == False, MaterialStock.current_qty > 0)
        )
        if raw_material_id:
            query = query.filter(MaterialStock.raw_material_id == raw_material_id)
        if warehouse_id:
            query = query.filter(MaterialStock.warehouse_id == warehouse_id)

        stocks = query.all()
        warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)

        # 자재별 그룹핑
        summary_map: dict[int, dict] = {}
        for s in stocks:
            rm_id = s.raw_material_id
            if rm_id not in summary_map:
                summary_map[rm_id] = {
                    "raw_material_id": rm_id,
                    "raw_material_name": s.raw_material.material_name if s.raw_material else "",
                    "raw_material_code": s.raw_material.material_code if s.raw_material else "",
                    "total_qty": 0.0,
                    "unit": s.unit,
                    "warehouse_breakdown": [],
                    "has_expiry_warning": False,
                }
            expiry_warn = bool(
                s.expiry_date and s.expiry_date.replace(tzinfo=timezone.utc) <= warning_threshold
            )
            summary_map[rm_id]["total_qty"] += float(s.current_qty)
            summary_map[rm_id]["warehouse_breakdown"].append({
                "warehouse_id": s.warehouse_id,
                "warehouse_name": s.warehouse.warehouse_name if s.warehouse else "",
                "lot_no": s.lot_no,
                "current_qty": float(s.current_qty),
                "unit_price": s.unit_price,
                "receive_date": s.receive_date,
                "expiry_date": s.expiry_date,
                "expiry_warning": expiry_warn,
            })
            if expiry_warn:
                summary_map[rm_id]["has_expiry_warning"] = True

        return list(summary_map.values())

    # ------------------------------------------------------------------
    # 원자재 출고 처리
    # ------------------------------------------------------------------

    def issue_material(
        self,
        db: Session,
        *,
        obj_in: MaterialIssueRequest,
        issued_by: str,
    ) -> MaterialTransaction:
        """원자재 출고 처리 (MaterialStock.current_qty 차감 + 이력 기록)."""
        filters = [
            MaterialStock.raw_material_id == obj_in.raw_material_id,
            MaterialStock.warehouse_id == obj_in.warehouse_id,
            MaterialStock.is_deleted == False,
            MaterialStock.current_qty > 0,
        ]
        if obj_in.lot_no:
            filters.append(MaterialStock.lot_no == obj_in.lot_no)

        stock = db.query(MaterialStock).filter(*filters).first()
        if not stock:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="출고 가능한 재고가 없습니다.",
            )
        if float(stock.current_qty) < obj_in.qty:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"재고 부족. 현재 재고: {stock.current_qty}",
            )

        before_qty = float(stock.current_qty)
        after_qty = before_qty - obj_in.qty
        stock.current_qty = after_qty
        stock.updated_by = issued_by

        txn = MaterialTransaction(
            raw_material_id=obj_in.raw_material_id,
            warehouse_id=obj_in.warehouse_id,
            trans_type="OUT",
            trans_date=datetime.now(timezone.utc),
            trans_qty=-obj_in.qty,
            before_qty=before_qty,
            after_qty=after_qty,
            unit_price=stock.unit_price,
            lot_no=stock.lot_no,
            work_order_id=obj_in.work_order_id,
            reason=obj_in.reason or "출고",
            notes=obj_in.notes,
            created_by=issued_by,
            updated_by=issued_by,
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn

    # ------------------------------------------------------------------
    # 입출고 이력 조회
    # ------------------------------------------------------------------

    def get_transactions(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 50,
        raw_material_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        trans_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> tuple[List[MaterialTransaction], int]:
        query = (
            db.query(MaterialTransaction)
            .options(
                joinedload(MaterialTransaction.raw_material),
                joinedload(MaterialTransaction.warehouse),
            )
            .filter(MaterialTransaction.is_deleted == False)
        )
        if raw_material_id:
            query = query.filter(MaterialTransaction.raw_material_id == raw_material_id)
        if warehouse_id:
            query = query.filter(MaterialTransaction.warehouse_id == warehouse_id)
        if trans_type:
            query = query.filter(MaterialTransaction.trans_type == trans_type)
        if date_from:
            query = query.filter(MaterialTransaction.trans_date >= date_from)
        if date_to:
            query = query.filter(MaterialTransaction.trans_date <= date_to)
        total = query.count()
        items = query.order_by(MaterialTransaction.trans_date.desc()).offset(skip).limit(limit).all()
        return items, total

    # ------------------------------------------------------------------
    # 완제품 재고 조회
    # ------------------------------------------------------------------

    def get_product_stock_detail(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 50,
        product_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> tuple[List[ProductStock], int]:
        query = (
            db.query(ProductStock)
            .options(
                joinedload(ProductStock.product),
                joinedload(ProductStock.warehouse),
            )
            .filter(ProductStock.is_deleted == False, ProductStock.current_qty > 0)
        )
        if product_id:
            query = query.filter(ProductStock.product_id == product_id)
        if warehouse_id:
            query = query.filter(ProductStock.warehouse_id == warehouse_id)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_product_stock_summary(
        self,
        db: Session,
        product_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> List[dict]:
        """제품별 총 재고 집계. 유통기한 30일 이내 경고 포함."""
        query = (
            db.query(ProductStock)
            .options(
                joinedload(ProductStock.product),
                joinedload(ProductStock.warehouse),
            )
            .filter(ProductStock.is_deleted == False, ProductStock.current_qty > 0)
        )
        if product_id:
            query = query.filter(ProductStock.product_id == product_id)
        if warehouse_id:
            query = query.filter(ProductStock.warehouse_id == warehouse_id)

        stocks = query.all()
        warning_threshold = datetime.now(timezone.utc) + timedelta(days=30)

        summary_map: dict[int, dict] = {}
        for s in stocks:
            pid = s.product_id
            if pid not in summary_map:
                summary_map[pid] = {
                    "product_id": pid,
                    "product_name": s.product.product_name if s.product else "",
                    "product_code": s.product.product_code if s.product else "",
                    "total_qty": 0.0,
                    "warehouse_breakdown": [],
                    "has_expiry_warning": False,
                }
            expiry_warn = bool(
                s.expiry_date and s.expiry_date.replace(tzinfo=timezone.utc) <= warning_threshold
            )
            summary_map[pid]["total_qty"] += float(s.current_qty)
            summary_map[pid]["warehouse_breakdown"].append({
                "warehouse_id": s.warehouse_id,
                "warehouse_name": s.warehouse.warehouse_name if s.warehouse else "",
                "lot_no": s.lot_no,
                "current_qty": float(s.current_qty),
                "production_date": s.production_date,
                "expiry_date": s.expiry_date,
                "expiry_warning": expiry_warn,
            })
            if expiry_warn:
                summary_map[pid]["has_expiry_warning"] = True

        return list(summary_map.values())

    # ------------------------------------------------------------------
    # 출하 처리
    # ------------------------------------------------------------------

    def create_shipment(
        self,
        db: Session,
        *,
        obj_in: ShipmentCreate,
        created_by: str,
    ) -> Shipment:
        """출하 헤더 + 상세 일괄 생성. total_qty/total_amount 자동 계산."""
        total_qty = sum(d.ship_qty for d in obj_in.details)
        total_amount = sum(int(d.ship_qty * d.unit_price) for d in obj_in.details)

        shipment = Shipment(
            shipment_no=_generate_shipment_no(db),
            order_id=obj_in.order_id,
            customer_id=obj_in.customer_id,
            shipment_date=obj_in.shipment_date,
            status="READY",
            delivery_address=obj_in.delivery_address,
            driver_name=obj_in.driver_name,
            vehicle_no=obj_in.vehicle_no,
            total_qty=total_qty,
            total_amount=total_amount,
            notes=obj_in.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(shipment)
        db.flush()  # shipment.id 확보

        for d in obj_in.details:
            detail = ShipmentDetail(
                shipment_id=shipment.id,
                product_id=d.product_id,
                order_detail_id=d.order_detail_id,
                lot_no=d.lot_no,
                ship_qty=d.ship_qty,
                unit_price=d.unit_price,
                amount=int(d.ship_qty * d.unit_price),
                expiry_date=d.expiry_date,
                notes=d.notes,
                created_by=created_by,
                updated_by=created_by,
            )
            db.add(detail)

        db.commit()
        return self.get_shipment(db, id=shipment.id)

    def get_shipment(self, db: Session, id: int) -> Optional[Shipment]:
        return (
            db.query(Shipment)
            .options(
                joinedload(Shipment.customer),
                joinedload(Shipment.order),
                joinedload(Shipment.details).joinedload(ShipmentDetail.product),
            )
            .filter(Shipment.id == id, Shipment.is_deleted == False)
            .first()
        )

    def get_shipment_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> tuple[List[Shipment], int]:
        query = (
            db.query(Shipment)
            .options(
                joinedload(Shipment.customer),
                joinedload(Shipment.order),
                joinedload(Shipment.details).joinedload(ShipmentDetail.product),
            )
            .filter(Shipment.is_deleted == False)
        )
        if status:
            query = query.filter(Shipment.status == status)
        if customer_id:
            query = query.filter(Shipment.customer_id == customer_id)
        if date_from:
            query = query.filter(Shipment.shipment_date >= date_from)
        if date_to:
            query = query.filter(Shipment.shipment_date <= date_to)
        total = query.count()
        items = query.order_by(Shipment.shipment_date.desc()).offset(skip).limit(limit).all()
        return items, total

    def ship_out(
        self,
        db: Session,
        *,
        shipment_id: int,
        shipped_by: str,
    ) -> Optional[Shipment]:
        """출하 확정: READY→SHIPPED, 완제품 재고 차감."""
        shipment = self.get_shipment(db, id=shipment_id)
        if not shipment:
            return None

        shipment.status = "SHIPPED"
        shipment.shipped_at = datetime.now(timezone.utc)
        shipment.updated_by = shipped_by

        for detail in shipment.details:
            filters = [
                ProductStock.product_id == detail.product_id,
                ProductStock.is_deleted == False,
                ProductStock.current_qty > 0,
            ]
            if detail.lot_no:
                filters.append(ProductStock.lot_no == detail.lot_no)
            stock = db.query(ProductStock).filter(*filters).first()
            if stock:
                stock.current_qty = float(stock.current_qty) - float(detail.ship_qty)
                stock.updated_by = shipped_by

        db.commit()
        return self.get_shipment(db, id=shipment_id)

    def deliver(
        self,
        db: Session,
        *,
        shipment_id: int,
        delivered_by: str,
    ) -> Optional[Shipment]:
        """배달 확인: SHIPPED→DELIVERED."""
        shipment = self.get_shipment(db, id=shipment_id)
        if not shipment:
            return None
        shipment.status = "DELIVERED"
        shipment.delivered_at = datetime.now(timezone.utc)
        shipment.updated_by = delivered_by
        db.commit()
        return self.get_shipment(db, id=shipment_id)

    def update_shipment(
        self,
        db: Session,
        *,
        db_obj: Shipment,
        obj_in,
        updated_by: str,
    ) -> Shipment:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db_obj.updated_by = updated_by
        db.add(db_obj)
        db.commit()
        return self.get_shipment(db, id=db_obj.id)


crud_inventory = CRUDInventory()
