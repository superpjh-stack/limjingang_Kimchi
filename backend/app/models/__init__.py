"""SQLAlchemy ORM 모델 패키지.

모든 모델을 임포트하여 Alembic 마이그레이션이 감지할 수 있도록 합니다.
"""

from app.models.base import TimestampMixin
from app.models.user import User, Role, UserRole
from app.models.product import Product
from app.models.bom import BOM, BOMDetail
from app.models.raw_material import RawMaterial
from app.models.process import Process, CCPStandard
from app.models.equipment import Equipment
from app.models.equipment_ext import EquipmentInspection, EquipmentFailure
from app.models.customer import Customer
from app.models.common_code import CommonCode
from app.models.order import Order, OrderDetail, OrderHistory
from app.models.production import ProductionPlan, WorkOrder, WorkOrderResult, QCRecord
from app.models.inventory import (
    Warehouse,
    MaterialReceive,
    MaterialStock,
    MaterialTransaction,
    ProductStock,
    Shipment,
    ShipmentDetail,
)
from app.models.process_detail import (
    WashRecord,
    SaltingRecord,
    SeasoningRecord,
    PackagingRecord,
    PreprocessRecord,
)
from app.models.lot_trace import LotTrace
from app.models.notification import Notification
from app.models.oee import OeeRecord
from app.models.worker import Worker
from app.models.washing import WashingBatch, ForeignMatterLog, WashingStandard
from app.models.salting import SaltingBatch, SaltingConcentrationLog

__all__ = [
    "TimestampMixin",
    "User",
    "Role",
    "UserRole",
    "Product",
    "BOM",
    "BOMDetail",
    "RawMaterial",
    "Process",
    "CCPStandard",
    "Equipment",
    "EquipmentInspection",
    "EquipmentFailure",
    "Customer",
    "CommonCode",
    "Order",
    "OrderDetail",
    "OrderHistory",
    "ProductionPlan",
    "WorkOrder",
    "WorkOrderResult",
    "QCRecord",
    "Warehouse",
    "MaterialReceive",
    "MaterialStock",
    "MaterialTransaction",
    "ProductStock",
    "Shipment",
    "ShipmentDetail",
    "WashRecord",
    "SaltingRecord",
    "SeasoningRecord",
    "PackagingRecord",
    "PreprocessRecord",
    "LotTrace",
    "Notification",
    "OeeRecord",
    "Worker",
    "WashingBatch",
    "ForeignMatterLog",
    "WashingStandard",
    "SaltingBatch",
    "SaltingConcentrationLog",
]
