# ─────────────────────────────────────────
# 임진강김치 MES - Frontend Dockerfile
# Node.js 20 Next.js 14 (개발 환경 - 핫리로드 활성화)
# ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치 (레이어 캐시 활용)
COPY package*.json ./
RUN npm install

# 소스코드 복사
# 개발 환경에서는 docker-compose volumes 마운트로 덮어쓰여짐
# node_modules 는 named volume 으로 분리하여 호스트 node_modules 와 충돌 방지
COPY . .

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000 || exit 1

# 개발 모드 실행 (Next.js Fast Refresh 활성화)
CMD ["npm", "run", "dev"]
