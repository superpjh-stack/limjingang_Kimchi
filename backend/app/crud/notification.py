"""알림 CRUD 모듈."""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


class CRUDNotification:
    """알림 CRUD 클래스."""

    def create(
        self,
        db: Session,
        *,
        data: NotificationCreate,
        created_by: str = "system",
    ) -> Notification:
        """알림을 생성합니다.

        Args:
            db: 데이터베이스 세션
            data: 생성 스키마
            created_by: 생성자 (기본값: system)

        Returns:
            생성된 알림 객체
        """
        obj = Notification(
            notification_type=data.notification_type,
            severity=data.severity,
            title=data.title,
            message=data.message,
            ref_table=data.ref_table,
            ref_id=data.ref_id,
            is_read=False,
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
        is_read: Optional[bool] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Notification], int]:
        """알림 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            is_read: 읽음 여부 필터
            severity: 심각도 필터
            skip: 오프셋
            limit: 최대 반환 수

        Returns:
            (알림 목록, 전체 개수) 튜플
        """
        query = db.query(Notification).filter(Notification.is_deleted == False)

        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        if severity:
            query = query.filter(Notification.severity == severity)

        total = query.count()
        items = (
            query.order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def mark_read(
        self,
        db: Session,
        *,
        notification_id: int,
        username: str,
    ) -> Optional[Notification]:
        """알림을 읽음 처리합니다.

        Args:
            db: 데이터베이스 세션
            notification_id: 알림 ID
            username: 읽은 사용자명

        Returns:
            수정된 알림 객체 또는 None
        """
        obj = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.is_deleted == False)
            .first()
        )
        if not obj:
            return None

        obj.is_read = True
        obj.read_at = datetime.now(timezone.utc)
        obj.read_by = username
        obj.updated_by = username
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def mark_all_read(self, db: Session, *, username: str) -> int:
        """읽지 않은 전체 알림을 읽음 처리합니다.

        Args:
            db: 데이터베이스 세션
            username: 읽은 사용자명

        Returns:
            처리된 알림 수
        """
        now = datetime.now(timezone.utc)
        count = (
            db.query(Notification)
            .filter(
                Notification.is_deleted == False,
                Notification.is_read == False,
            )
            .update(
                {
                    "is_read": True,
                    "read_at": now,
                    "read_by": username,
                    "updated_by": username,
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return count

    def get_count(self, db: Session) -> dict:
        """알림 카운트 정보를 반환합니다.

        Args:
            db: 데이터베이스 세션

        Returns:
            {unread_count, total_count, danger_count, warning_count}
        """
        base = db.query(Notification).filter(Notification.is_deleted == False)
        total_count = base.count()
        unread_count = base.filter(Notification.is_read == False).count()
        danger_count = base.filter(
            Notification.severity == "DANGER",
            Notification.is_read == False,
        ).count()
        warning_count = base.filter(
            Notification.severity == "WARNING",
            Notification.is_read == False,
        ).count()
        return {
            "unread_count": unread_count,
            "total_count": total_count,
            "danger_count": danger_count,
            "warning_count": warning_count,
        }

    def _is_duplicate_today(
        self,
        db: Session,
        *,
        notification_type: str,
        ref_id: Optional[int],
    ) -> bool:
        """오늘 이미 동일한 (notification_type + ref_id) 알림이 있는지 확인합니다.

        Args:
            db: 데이터베이스 세션
            notification_type: 알림 유형
            ref_id: 참조 레코드 ID

        Returns:
            중복 여부
        """
        today_start = datetime.combine(date.today(), datetime.min.time())
        query = db.query(Notification).filter(
            Notification.is_deleted == False,
            Notification.notification_type == notification_type,
            Notification.created_at >= today_start,
        )
        if ref_id is not None:
            query = query.filter(Notification.ref_id == ref_id)
        return query.count() > 0

    def trigger_check(self, db: Session) -> list[Notification]:
        """시스템 상태를 체크하고 알림을 자동 생성합니다.

        체크 항목:
        1. 재고 부족: TB_MATERIAL_STOCK.current_qty < min_qty
        2. 최근 24시간 CCP 이탈: TB_QC_RECORD.is_pass=False
        3. 오픈 설비 고장: TB_EQUIPMENT_FAILURE.status='OPEN'
        4. 납기 D-3 미확정 수주: TB_ORDER.status='CONFIRMED', delivery_date <= today+3

        중복 방지: 오늘 이미 같은 (notification_type + ref_id) 조합이면 skip

        Args:
            db: 데이터베이스 세션

        Returns:
            새로 생성된 알림 목록
        """
        created: list[Notification] = []
        today = date.today()

        # 1. 재고 부족 체크
        try:
            from app.models.inventory import MaterialStock

            low_stocks = (
                db.query(MaterialStock)
                .filter(
                    MaterialStock.is_deleted == False,
                    MaterialStock.min_qty.isnot(None),
                    MaterialStock.current_qty < MaterialStock.min_qty,
                )
                .all()
            )
            for stock in low_stocks:
                if not self._is_duplicate_today(
                    db,
                    notification_type="STOCK_LOW",
                    ref_id=stock.id,
                ):
                    raw_name = getattr(stock, "raw_material_id", stock.id)
                    notif = self.create(
                        db,
                        data=NotificationCreate(
                            notification_type="STOCK_LOW",
                            severity="WARNING",
                            title=f"재고 부족: 원재료 ID {stock.raw_material_id}",
                            message=(
                                f"현재 재고({float(stock.current_qty):.1f})가 "
                                f"최소 재고({float(stock.min_qty):.1f}) 미만입니다."
                            ),
                            ref_table="TB_MATERIAL_STOCK",
                            ref_id=stock.id,
                        ),
                        created_by="system",
                    )
                    created.append(notif)
        except Exception:
            pass

        # 2. 최근 24시간 CCP 이탈 체크
        try:
            from app.models.production import QCRecord

            cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
            ccp_violations = (
                db.query(QCRecord)
                .filter(
                    QCRecord.is_deleted == False,
                    QCRecord.is_pass == False,
                    QCRecord.created_at >= cutoff_24h,
                )
                .all()
            )
            for violation in ccp_violations:
                if not self._is_duplicate_today(
                    db,
                    notification_type="CCP_VIOLATION",
                    ref_id=violation.id,
                ):
                    notif = self.create(
                        db,
                        data=NotificationCreate(
                            notification_type="CCP_VIOLATION",
                            severity="DANGER",
                            title="CCP 기준 이탈 발생",
                            message=f"QC 검사 ID {violation.id}에서 CCP 기준 이탈이 감지되었습니다.",
                            ref_table="TB_QC_RECORD",
                            ref_id=violation.id,
                        ),
                        created_by="system",
                    )
                    created.append(notif)
        except Exception:
            pass

        # 3. 오픈 설비 고장 체크
        try:
            from app.models.equipment_ext import EquipmentFailure

            open_failures = (
                db.query(EquipmentFailure)
                .filter(
                    EquipmentFailure.is_deleted == False,
                    EquipmentFailure.status == "OPEN",
                )
                .all()
            )
            for failure in open_failures:
                if not self._is_duplicate_today(
                    db,
                    notification_type="EQUIPMENT_FAILURE",
                    ref_id=failure.id,
                ):
                    notif = self.create(
                        db,
                        data=NotificationCreate(
                            notification_type="EQUIPMENT_FAILURE",
                            severity="DANGER",
                            title=f"미처리 설비 고장: {failure.failure_no}",
                            message=f"설비 ID {failure.equipment_id} 고장이 미해결 상태입니다. 증상: {failure.symptoms}",
                            ref_table="TB_EQUIPMENT_FAILURE",
                            ref_id=failure.id,
                        ),
                        created_by="system",
                    )
                    created.append(notif)
        except Exception:
            pass

        # 4. 납기 D-3 미확정 수주 체크
        try:
            from app.models.order import Order

            deadline = today + timedelta(days=3)
            risky_orders = (
                db.query(Order)
                .filter(
                    Order.is_deleted == False,
                    Order.status == "CONFIRMED",
                    Order.delivery_date <= deadline,
                )
                .all()
            )
            for order in risky_orders:
                if not self._is_duplicate_today(
                    db,
                    notification_type="DELIVERY_RISK",
                    ref_id=order.id,
                ):
                    notif = self.create(
                        db,
                        data=NotificationCreate(
                            notification_type="DELIVERY_RISK",
                            severity="WARNING",
                            title=f"납기 위험 수주: {order.order_no}",
                            message=(
                                f"납기일({order.delivery_date}) D-3 이내 수주가 "
                                f"아직 생산 완료되지 않았습니다."
                            ),
                            ref_table="TB_ORDER",
                            ref_id=order.id,
                        ),
                        created_by="system",
                    )
                    created.append(notif)
        except Exception:
            pass

        return created


# NotificationCreate는 내부에서 참조하므로 임포트
from app.schemas.notification import NotificationCreate  # noqa: E402

crud_notification = CRUDNotification()
