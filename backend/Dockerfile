# ─────────────────────────────────────────
# 임진강김치 MES - Backend Dockerfile
# Python 3.11 FastAPI (개발 환경 - 핫리로드 활성화)
# ─────────────────────────────────────────
FROM python:3.11-slim

# 시스템 패키지 업데이트 및 필수 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 파일 복사 및 설치 (레이어 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# 소스코드 복사
# 개발 환경에서는 docker-compose volumes 마운트로 덮어쓰여짐
COPY . .

# 포트 노출
EXPOSE 8000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 개발 모드: --reload 플래그로 핫리로드 활성화
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
