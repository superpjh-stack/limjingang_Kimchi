-- ============================================================
-- 임진강김치 MES 시스템 - 세척공정 스키마
-- Sprint 7 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- TB_WASHING_BATCH (세척 배치)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_WASHING_BATCH (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_no             VARCHAR(20)   NOT NULL UNIQUE COMMENT 'WASH-YYYYMMDD-NNN',
    work_order_id        BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    lot_no               VARCHAR(30)   NOT NULL,
    material_type        VARCHAR(20)   NOT NULL COMMENT 'CABBAGE/RADISH/GREEN_ONION/MUSTARD_GREEN/OTHER',
    input_weight_kg      DECIMAL(10,2) NOT NULL,
    water_temp_c         DECIMAL(5,1)  NOT NULL,
    wash_count           SMALLINT      NOT NULL DEFAULT 0,
    wash_duration_min    SMALLINT      NULL,
    quality_grade        VARCHAR(5)    NULL COMMENT 'A/B/C',
    status               VARCHAR(20)   NOT NULL DEFAULT 'WAITING' COMMENT 'WAITING/IN_PROGRESS/COMPLETED/ON_HOLD/DISCARDED',
    remarks              TEXT          NULL,
    start_time           DATETIME      NULL,
    end_time             DATETIME      NULL,
    created_by           VARCHAR(50)   NOT NULL,
    updated_by           VARCHAR(50)   NULL,
    created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted           TINYINT(1)    NOT NULL DEFAULT 0,
    INDEX idx_wb_work_order (work_order_id),
    INDEX idx_wb_status (status),
    INDEX idx_wb_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='세척배치';

-- ============================================================
-- TB_FOREIGN_MATTER_LOG (이물질 검출 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_FOREIGN_MATTER_LOG (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id             BIGINT        NOT NULL COMMENT 'TB_WASHING_BATCH.id',
    matter_type          VARCHAR(20)   NOT NULL COMMENT 'STONE/SOIL/INSECT/METAL/OTHER',
    detection_point      VARCHAR(100)  NOT NULL,
    description          TEXT          NULL,
    action_taken         VARCHAR(20)   NULL COMMENT 'RE_WASH/DISCARD/ON_HOLD',
    action_by            VARCHAR(50)   NULL,
    action_at            DATETIME      NULL,
    action_memo          TEXT          NULL,
    reported_by          VARCHAR(50)   NOT NULL,
    reported_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fml_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='이물질검출이력';

-- ============================================================
-- TB_WASHING_STANDARD (세척 기준 마스터)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_WASHING_STANDARD (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    material_type        VARCHAR(20)   NOT NULL UNIQUE,
    material_name        VARCHAR(50)   NOT NULL,
    min_wash_count       SMALLINT      NOT NULL,
    recommended_count    SMALLINT      NOT NULL,
    min_temp_c           DECIMAL(4,1)  NOT NULL,
    max_temp_c           DECIMAL(4,1)  NOT NULL,
    wash_method          VARCHAR(200)  NOT NULL,
    haccp_ccp_code       VARCHAR(20)   NOT NULL DEFAULT 'CCP-W1',
    is_active            TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='세척기준마스터';

INSERT IGNORE INTO TB_WASHING_STANDARD (material_type, material_name, min_wash_count, recommended_count, min_temp_c, max_temp_c, wash_method, haccp_ccp_code)
VALUES
('CABBAGE',       '배추',   3, 4, 5.0, 15.0, '침지 + 브러시',          'CCP-W1'),
('RADISH',        '무',     2, 3, 5.0, 15.0, '고압세척 + 침지',         'CCP-W1'),
('GREEN_ONION',   '파',     3, 4, 5.0, 15.0, '흐르는 물 + 침지',        'CCP-W1'),
('MUSTARD_GREEN', '갓',     3, 4, 5.0, 12.0, '침지 + 흐르는 물',        'CCP-W1'),
('OTHER',         '기타',   2, 3, 5.0, 15.0, '흐르는 물',               'CCP-W1');
