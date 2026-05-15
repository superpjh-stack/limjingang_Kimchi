"""API v1 라우터 - 모든 엔드포인트를 통합합니다."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    products,
    bom,
    raw_materials,
    processes,
    equipment,
    customers,
    common_codes,
    orders,
    production_plans,
    work_orders,
    inventory,
    shipments,
    kpi,
    cold_storage,
    equipment_ext,
    admin,
    ai_agent,
    process_detail,
    lot_trace,
    notifications,
    oee,
    reports,
    workers,
    washing,
    salting,
)

api_router = APIRouter()

# 인증 엔드포인트 (prefix 없음 - /auth/login 형태)
api_router.include_router(auth.router, prefix="/auth", tags=["인증"])

# 마스터 데이터 엔드포인트
api_router.include_router(products.router, prefix="/products", tags=["제품 관리"])
api_router.include_router(bom.router, prefix="/boms", tags=["BOM 관리"])
api_router.include_router(raw_materials.router, prefix="/raw-materials", tags=["원재료 관리"])
api_router.include_router(processes.router, prefix="/processes", tags=["공정 관리"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["설비 관리"])
api_router.include_router(customers.router, prefix="/customers", tags=["고객 관리"])
api_router.include_router(common_codes.router, prefix="/common-codes", tags=["공통 코드"])
api_router.include_router(workers.router, prefix="/workers", tags=["작업자 관리"])

# Sprint 2 - 생산 운영 엔드포인트
api_router.include_router(orders.router, prefix="/orders", tags=["수주관리"])
api_router.include_router(production_plans.router, prefix="/production-plans", tags=["생산계획"])
api_router.include_router(work_orders.router, prefix="/work-orders", tags=["작업지시"])

# Sprint 3 - 재고·출하·KPI 엔드포인트
api_router.include_router(inventory.router, prefix="/inventory", tags=["재고관리"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["출하관리"])
api_router.include_router(kpi.router, prefix="/kpi", tags=["KPI"])

# Sprint 4 - 숙성냉장관리 엔드포인트
api_router.include_router(cold_storage.router, prefix="/cold-storage", tags=["숙성냉장관리"])

# Sprint 4 - 설비 확장(점검·고장) 엔드포인트
api_router.include_router(equipment_ext.router, prefix="/equipment", tags=["설비관리 확장"])

# Sprint 4 - 시스템관리 엔드포인트
api_router.include_router(admin.router, prefix="/admin", tags=["시스템관리"])

# Sprint 5 - AI Agent 엔드포인트
api_router.include_router(ai_agent.router, prefix="/ai", tags=["AI Agent"])

# Sprint 5 - 공정별 특화 실적 엔드포인트
api_router.include_router(process_detail.router, prefix="/process-records", tags=["공정별실적"])

# Sprint 6 - LOT 추적, 알림, OEE, 보고서 엔드포인트
api_router.include_router(lot_trace.router, prefix="/lot-trace", tags=["lot-trace"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(oee.router, prefix="/oee", tags=["oee"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

# Sprint 7 - 세척/절임 공정 배치 관리 엔드포인트
api_router.include_router(washing.router, prefix="/washing", tags=["세척공정"])
api_router.include_router(salting.router, prefix="/salting", tags=["절임공정"])
