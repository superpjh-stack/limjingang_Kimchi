-- ============================================================
-- 15_schema_quality.sql
-- 품질관리 테이블 생성 및 초기 시드 데이터 (CCP4 금속검출 + 품질 이슈)
-- ============================================================

-- ------------------------------------------------------------
-- 1. TB_METAL_DETECT_LOG - 금속검출 기록
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_METAL_DETECT_LOG (
    id               BIGINT       NOT NULL AUTO_INCREMENT COMMENT '기본키',
    detector_id      VARCHAR(10)  NOT NULL                COMMENT '검출기 ID (MD-01~03)',
    product_code     VARCHAR(20)  NOT NULL                COMMENT '제품 코드',
    product_name     VARCHAR(100) NOT NULL                COMMENT '제품명',
    batch_no         VARCHAR(30)  NOT NULL                COMMENT '배치 번호',
    result           VARCHAR(10)  NOT NULL                COMMENT 'PASS / FAIL',
    detection_type   VARCHAR(20)  NULL                    COMMENT '검출 유형 Fe/Sus/Non-Fe (FAIL시)',
    detection_size_mm DOUBLE      NULL                    COMMENT '검출 크기 mm (FAIL시)',
    action_taken     VARCHAR(100) NULL                    COMMENT '조치사항 (FAIL시)',
    inspector        VARCHAR(50)  NOT NULL                COMMENT '검사자',
    inspected_at     DATETIME     NOT NULL DEFAULT NOW()  COMMENT '검사 일시',
    notes            TEXT         NULL                    COMMENT '비고',
    created_at       DATETIME     NOT NULL DEFAULT NOW()  COMMENT '생성일시',
    PRIMARY KEY (id),
    INDEX idx_metal_detect_date   (DATE(inspected_at)),
    INDEX idx_metal_detect_result (result),
    INDEX idx_metal_detect_detector (detector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='금속검출 기록 (CCP4)';


-- ------------------------------------------------------------
-- 2. TB_QUALITY_ISSUE - 품질 이슈 관리
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_QUALITY_ISSUE (
    id            BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '기본키',
    issue_no      VARCHAR(30)  NOT NULL                 COMMENT '이슈번호 ISS-YYYYMMDD-NNN',
    issue_type    VARCHAR(30)  NOT NULL                 COMMENT 'CCP이탈/이물질/금속검출FAIL/불량률초과/관능검사이상/기타',
    severity      VARCHAR(10)  NOT NULL                 COMMENT 'CRITICAL/HIGH/MEDIUM/LOW',
    status        VARCHAR(20)  NOT NULL DEFAULT 'OPEN'  COMMENT 'OPEN/IN_PROGRESS/RESOLVED/CLOSED',
    title         VARCHAR(200) NOT NULL                 COMMENT '이슈 제목',
    description   TEXT         NULL                     COMMENT '이슈 상세 내용',
    occurred_at   DATETIME     NOT NULL                 COMMENT '발생 일시',
    detected_by   VARCHAR(50)  NOT NULL                 COMMENT '검출자',
    assigned_to   VARCHAR(50)  NULL                     COMMENT '담당자',
    resolved_at   DATETIME     NULL                     COMMENT '해결 일시',
    resolution    TEXT         NULL                     COMMENT '해결 내용',
    related_batch VARCHAR(30)  NULL                     COMMENT '관련 배치 번호',
    created_at    DATETIME     NOT NULL DEFAULT NOW()   COMMENT '생성일시',
    updated_at    DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW() COMMENT '수정일시',
    PRIMARY KEY (id),
    UNIQUE KEY uq_issue_no (issue_no),
    INDEX idx_quality_issue_status   (status),
    INDEX idx_quality_issue_severity (severity),
    INDEX idx_quality_issue_type     (issue_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='품질 이슈 관리';


-- ------------------------------------------------------------
-- 3. 시드 데이터 - TB_METAL_DETECT_LOG (5건: PASS 4, FAIL 1)
-- ------------------------------------------------------------
INSERT INTO TB_METAL_DETECT_LOG
    (detector_id, product_code, product_name, batch_no, result,
     detection_type, detection_size_mm, action_taken,
     inspector, inspected_at, notes)
VALUES
    ('MD-01', 'KIM-001', '포기김치 5kg', 'BATCH-20260515-001', 'PASS',
     NULL, NULL, NULL,
     '김품질', '2026-05-15 08:10:00', '정기 검사 이상없음'),

    ('MD-02', 'KIM-002', '깍두기 2kg', 'BATCH-20260515-002', 'PASS',
     NULL, NULL, NULL,
     '이검사', '2026-05-15 09:25:00', NULL),

    ('MD-03', 'KIM-003', '열무김치 3kg', 'BATCH-20260515-003', 'PASS',
     NULL, NULL, NULL,
     '박점검', '2026-05-15 10:40:00', '오전 2차 검사'),

    ('MD-01', 'KIM-001', '포기김치 5kg', 'BATCH-20260515-004', 'FAIL',
     'Fe', 2.3, '해당 배치 전량 격리 후 재검사 및 폐기 처리',
     '김품질', '2026-05-15 13:15:00', 'Fe 2.3mm 검출. CCP4 기준(Fe 1.5mm) 초과'),

    ('MD-02', 'KIM-004', '총각김치 1kg', 'BATCH-20260515-005', 'PASS',
     NULL, NULL, NULL,
     '이검사', '2026-05-15 14:50:00', '오후 정기 검사 이상없음');


-- ------------------------------------------------------------
-- 4. 시드 데이터 - TB_QUALITY_ISSUE (6건: severity/status 다양)
-- ------------------------------------------------------------
INSERT INTO TB_QUALITY_ISSUE
    (issue_no, issue_type, severity, status, title, description,
     occurred_at, detected_by, assigned_to, resolved_at, resolution, related_batch)
VALUES
    ('ISS-20260515-001', '금속검출FAIL', 'CRITICAL', 'IN_PROGRESS',
     '[CCP4] MD-01 Fe 2.3mm 검출 - BATCH-20260515-004',
     'MD-01 검출기에서 Fe 재질 2.3mm 이물질 검출. CCP4 기준(Fe ≤1.5mm) 초과로 긴급 대응 필요.',
     '2026-05-15 13:15:00', '김품질', '박공정',
     NULL, NULL, 'BATCH-20260515-004'),

    ('ISS-20260514-001', 'CCP이탈', 'HIGH', 'RESOLVED',
     '[CCP2] 절임 염도 기준 이탈 - 3% 초과',
     '절임 공정 CCP2 염도 측정값 5.2%로 기준 범위(3±0.5%) 초과 이탈 발생.',
     '2026-05-14 10:30:00', '이절임', '최품질',
     '2026-05-14 16:00:00', '추가 세척 후 재염도 측정 완료. 4.8%로 기준 내 확인. 재발방지 교육 실시.', 'SALT-20260514-003'),

    ('ISS-20260513-001', '이물질', 'HIGH', 'RESOLVED',
     '세척 후 이물질(토사) 검출 - 포기김치 배치',
     '세척 완료 후 토사 이물질 1건 검출. 세척 횟수 부족으로 추정.',
     '2026-05-13 09:00:00', '박세척', '김세척',
     '2026-05-13 14:30:00', '추가 세척 3회 실시 후 재검사 이상없음. 세척 기준 재교육 완료.', 'WASH-20260513-002'),

    ('ISS-20260515-002', '관능검사이상', 'MEDIUM', 'OPEN',
     '포기김치 색상 불량 - 황변 발생 의심',
     '오전 관능검사 시 포기김치 일부 황변 발생 의심. 숙성 온도 점검 필요.',
     '2026-05-15 11:00:00', '최관능', NULL,
     NULL, NULL, 'BATCH-20260515-003'),

    ('ISS-20260512-001', '불량률초과', 'MEDIUM', 'CLOSED',
     '포장 불량률 2.3% - 기준(1%) 초과',
     '5월 12일 포장 공정 불량률 2.3% 발생. 포장기 노후화로 인한 실링 불량 다수.',
     '2026-05-12 15:00:00', '이포장', '설비팀장',
     '2026-05-13 09:00:00', '포장기 실링부 부품 교체 완료. 불량률 0.4%로 정상화 확인.', NULL),

    ('ISS-20260515-003', '기타', 'LOW', 'OPEN',
     '냉장창고 C구역 온도 센서 오작동 의심',
     '냉장창고 C-03 센서값 -1.2°C 표시. 인접 센서 대비 이상값으로 점검 요청.',
     '2026-05-15 07:30:00', '박창고', '설비팀',
     NULL, NULL, NULL);
