"""AI Agent 엔드포인트 — Sprint 5 지능형 분석 API

GET /ai/dashboard           — 전체 AI 분석 요약
GET /ai/production-forecast — 생산량 예측
GET /ai/material-reorder    — 원재료 발주 추천
GET /ai/equipment-alerts    — 설비 예방정비 알림
GET /ai/defect-trend        — 불량률 트렌드 분석
GET /ai/delivery-risks      — 납기 리스크 분석
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.ai_analyzer import ai_analyzer

router = APIRouter()


@router.get("/dashboard")
def get_ai_dashboard(db: Session = Depends(get_db)):
    """전체 AI 분석 통합 요약 (5분 캐시 권장)"""
    return ai_analyzer.get_ai_dashboard_summary(db)


@router.get("/production-forecast")
def get_production_forecast(db: Session = Depends(get_db)):
    """생산량 예측 — 최근 14일 이동평균 기반 내일·이번 주 예측"""
    return ai_analyzer.get_production_forecast(db)


@router.get("/material-reorder")
def get_material_reorder(db: Session = Depends(get_db)):
    """원재료 발주 추천 — 확정 생산계획 BOM 기반 부족분 산출"""
    return ai_analyzer.get_material_reorder_recommendations(db)


@router.get("/equipment-alerts")
def get_equipment_alerts(db: Session = Depends(get_db)):
    """설비 예방정비 알림 — 점검 임박 및 반복 고장 설비"""
    return ai_analyzer.get_equipment_alerts(db)


@router.get("/defect-trend")
def get_defect_trend(db: Session = Depends(get_db)):
    """불량률 트렌드 분석 — 14일 추이 + 공정별 비교 + 목표 1.3% 대비"""
    return ai_analyzer.get_defect_trend_analysis(db)


@router.get("/delivery-risks")
def get_delivery_risks(db: Session = Depends(get_db)):
    """납기 리스크 분석 — 7일 이내 납기 수주의 위험도 분류"""
    return ai_analyzer.get_delivery_risk_analysis(db)
