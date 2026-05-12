-- ============================================================
-- 임진강김치 MES 시스템 - 데이터베이스 초기화 스크립트
-- MySQL 8.0 / Docker entrypoint 자동 실행
-- ============================================================

-- 메인 운영 데이터베이스
CREATE DATABASE IF NOT EXISTS mes_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 테스트용 데이터베이스
CREATE DATABASE IF NOT EXISTS mes_db_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- mes_user 에게 두 데이터베이스 권한 부여
-- (MYSQL_USER 환경변수로 생성된 사용자)
GRANT ALL PRIVILEGES ON mes_db.* TO 'mes_user'@'%';
GRANT ALL PRIVILEGES ON mes_db_test.* TO 'mes_user'@'%';

FLUSH PRIVILEGES;
