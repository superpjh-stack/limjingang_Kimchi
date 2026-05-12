"""고객 CRUD 모듈."""

from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    """고객 CRUD 클래스.

    고객 코드 검색, 유형별 필터링 등 고객 관련 특수 메서드를 제공합니다.
    """

    def get_by_code(self, db: Session, *, customer_code: str) -> Optional[Customer]:
        """고객 코드로 고객을 조회합니다.

        Args:
            db: 데이터베이스 세션
            customer_code: 조회할 고객 코드

        Returns:
            고객 객체 또는 None
        """
        return (
            db.query(Customer)
            .filter(
                Customer.customer_code == customer_code,
                Customer.is_deleted == False,
            )
            .first()
        )

    def get_multi_with_search(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        customer_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Customer], int]:
        """검색 조건으로 고객 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            skip: 오프셋
            limit: 최대 반환 수
            search: 검색어 (코드, 이름)
            customer_type: 고객 유형 필터
            is_active: 활성 여부 필터

        Returns:
            (고객 목록, 전체 개수) 튜플
        """
        query = db.query(Customer).filter(Customer.is_deleted == False)

        if search:
            query = query.filter(
                or_(
                    Customer.customer_code.ilike(f"%{search}%"),
                    Customer.customer_name.ilike(f"%{search}%"),
                    Customer.contact_person.ilike(f"%{search}%"),
                )
            )

        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)

        if is_active is not None:
            query = query.filter(Customer.is_active == is_active)

        total = query.count()
        items = (
            query.order_by(Customer.customer_code).offset(skip).limit(limit).all()
        )
        return items, total


crud_customer = CRUDCustomer(Customer)
