-- Sprint 5: 공정별 특화 실적 테이블
-- 세척·절임·양념버무림·포장·입고전처리 HACCP 공정 데이터 저장
USE mes_db;

-- -------------------------------------------------------------------
-- 세척 실적 (TB_WASH_RECORD)
-- CCP: 세척수 온도 1~15°C, 세척수 pH 6.5~8.5
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_WASH_RECORD (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id   BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    wash_water_temp DECIMAL(5,2)  NULL COMMENT '세척수 온도(°C) CCP: 1~15',
    wash_pressure   DECIMAL(5,2)  NULL COMMENT '세척압력(kg/cm²)',
    wash_duration   INT           NULL COMMENT '세척시간(분)',
    wash_water_ph   DECIMAL(4,2)  NULL COMMENT '세척수 pH CCP: 6.5~8.5',
    input_weight    DECIMAL(10,2) NULL COMMENT '투입중량(kg)',
    output_weight   DECIMAL(10,2) NULL COMMENT '세척후중량(kg)',
    foreign_matter  TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '이물질 발견여부',
    foreign_detail  VARCHAR(200)  NULL COMMENT '이물질 내용',
    wash_result     VARCHAR(20)   NOT NULL DEFAULT 'PASS' COMMENT 'PASS/FAIL/CONDITIONAL',
    recorded_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '기록일시',
    recorded_by     VARCHAR(50)   NULL COMMENT '기록자',
    notes           VARCHAR(500)  NULL COMMENT '비고',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50)   NOT NULL DEFAULT 'system',
    updated_by      VARCHAR(50)   NOT NULL DEFAULT 'system',
    is_deleted      TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_wash_wo FOREIGN KEY (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_wash_wo (work_order_id),
    INDEX idx_wash_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='세척실적';

-- -------------------------------------------------------------------
-- 절임 실적 (TB_SALTING_RECORD)
-- CCP: 염수농도 15~20%, 절임시간 360~1080분, 절임후 염도 2.5~3.0%
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_SALTING_RECORD (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id       BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    brine_concentration DECIMAL(5,2)  NULL COMMENT '염수농도(%) CCP: 15~20',
    salting_start_time  DATETIME      NULL COMMENT '절임 시작일시',
    salting_end_time    DATETIME      NULL COMMENT '절임 완료일시',
    salting_duration    INT           NULL COMMENT '절임시간(분) CCP: 360~1080 (자동계산)',
    input_weight        DECIMAL(10,2) NULL COMMENT '절임전 배추중량(kg)',
    output_weight       DECIMAL(10,2) NULL COMMENT '절임후중량(kg)',
    salinity_result     DECIMAL(5,2)  NULL COMMENT '절임 후 염도(%) CCP: 2.5~3.0',
    water_rinse_count   INT           NOT NULL DEFAULT 3 COMMENT '탈수 세척 횟수',
    salting_result      VARCHAR(20)   NOT NULL DEFAULT 'PASS' COMMENT 'PASS/FAIL/REWORK',
    recorded_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '기록일시',
    recorded_by         VARCHAR(50)   NULL COMMENT '기록자',
    notes               VARCHAR(500)  NULL COMMENT '비고',
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    updated_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    is_deleted          TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_salt_wo FOREIGN KEY (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_salt_wo (work_order_id),
    INDEX idx_salt_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='절임실적';

-- -------------------------------------------------------------------
-- 양념버무림 실적 (TB_SEASONING_RECORD)
-- CCP: 혼합온도 -2~10°C
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_SEASONING_RECORD (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id       BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    seasoning_ratio     DECIMAL(5,2)  NULL COMMENT '양념배합비(%) 양념/배추',
    mix_temperature     DECIMAL(5,2)  NULL COMMENT '혼합온도(°C) CCP: -2~10',
    mix_duration        INT           NULL COMMENT '혼합시간(분)',
    garlic_amount       DECIMAL(8,2)  NULL COMMENT '마늘함량(g/kg)',
    pepper_amount       DECIMAL(8,2)  NULL COMMENT '고추가루함량(g/kg)',
    ginger_amount       DECIMAL(8,2)  NULL COMMENT '생강함량(g/kg)',
    input_weight        DECIMAL(10,2) NULL COMMENT '투입중량(kg)',
    output_weight       DECIMAL(10,2) NULL COMMENT '버무림후중량(kg)',
    seasoning_result    VARCHAR(20)   NOT NULL DEFAULT 'PASS' COMMENT 'PASS/FAIL/ADJUST',
    lot_no              VARCHAR(30)   NULL COMMENT '생산 LOT 번호',
    recorded_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '기록일시',
    recorded_by         VARCHAR(50)   NULL COMMENT '기록자',
    notes               VARCHAR(500)  NULL COMMENT '비고',
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    updated_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    is_deleted          TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_season_wo FOREIGN KEY (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_season_wo (work_order_id),
    INDEX idx_season_lot (lot_no),
    INDEX idx_season_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='양념버무림실적';

-- -------------------------------------------------------------------
-- 포장 실적 (TB_PACKAGING_RECORD)
-- CCP: 금속검출 PASS 필수, 포장중량 허용오차 ±3%
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_PACKAGING_RECORD (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id       BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    target_weight       DECIMAL(8,2)  NULL COMMENT '목표 포장중량(g)',
    actual_weight_avg   DECIMAL(8,2)  NULL COMMENT '실측 평균중량(g)',
    weight_tolerance    DECIMAL(5,2)  NOT NULL DEFAULT 3.0 COMMENT '허용오차(%)',
    total_packages      INT           NULL COMMENT '총 포장수량(개/박스)',
    defect_packages     INT           NOT NULL DEFAULT 0 COMMENT '불량 포장수(개)',
    metal_detect_result VARCHAR(20)   NOT NULL DEFAULT 'PASS' COMMENT 'PASS/FAIL',
    seal_quality        VARCHAR(20)   NOT NULL DEFAULT 'GOOD' COMMENT '실링상태: GOOD/POOR/FAIL',
    label_check         TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '라벨 부착 확인',
    expiry_date_set     DATE          NULL COMMENT '유통기한 설정일',
    lot_no              VARCHAR(30)   NULL COMMENT '생산 LOT 번호',
    packaging_result    VARCHAR(20)   NOT NULL DEFAULT 'PASS' COMMENT 'PASS/FAIL',
    defect_rate         DECIMAL(5,2)  NULL COMMENT '불량률(%) 자동계산',
    recorded_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '기록일시',
    recorded_by         VARCHAR(50)   NULL COMMENT '기록자',
    notes               VARCHAR(500)  NULL COMMENT '비고',
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    updated_by          VARCHAR(50)   NOT NULL DEFAULT 'system',
    is_deleted          TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_pack_wo FOREIGN KEY (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_pack_wo (work_order_id),
    INDEX idx_pack_lot (lot_no),
    INDEX idx_pack_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='포장실적';

-- -------------------------------------------------------------------
-- 입고전처리 실적 (TB_PREPROCESS_RECORD)
-- 원재료 입고 시 세척·선별·이물질제거 전처리 기록
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_PREPROCESS_RECORD (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id          BIGINT        NULL COMMENT 'TB_WORK_ORDER.id (독립 기록 시 NULL)',
    raw_material_id        BIGINT        NOT NULL COMMENT 'TB_RAW_MATERIAL.id',
    receive_date           DATE          NOT NULL COMMENT '입고일',
    input_weight           DECIMAL(10,2) NOT NULL COMMENT '투입중량(kg)',
    reject_weight          DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '불합격중량(kg)',
    pass_weight            DECIMAL(10,2) NULL COMMENT '합격중량(kg) 자동계산',
    storage_temp           DECIMAL(5,2)  NULL COMMENT '보관온도(°C)',
    foreign_matter_removed TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '이물질제거여부',
    pre_wash_done          TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '세척여부',
    reject_reason          VARCHAR(200)  NULL COMMENT '불합격 사유',
    recorded_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '기록일시',
    recorded_by            VARCHAR(50)   NULL COMMENT '기록자',
    notes                  VARCHAR(500)  NULL COMMENT '비고',
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by             VARCHAR(50)   NOT NULL DEFAULT 'system',
    updated_by             VARCHAR(50)   NOT NULL DEFAULT 'system',
    is_deleted             TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_prep_wo  FOREIGN KEY (work_order_id)   REFERENCES TB_WORK_ORDER(id),
    CONSTRAINT fk_prep_mat FOREIGN KEY (raw_material_id) REFERENCES TB_RAW_MATERIAL(id),
    INDEX idx_prep_wo   (work_order_id),
    INDEX idx_prep_mat  (raw_material_id),
    INDEX idx_prep_date (receive_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='입고전처리실적';
