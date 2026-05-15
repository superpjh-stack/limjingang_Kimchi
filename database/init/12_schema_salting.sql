-- ============================================================
-- 임진강김치 MES 시스템 - 절임공정 스키마
-- Sprint 7 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- TB_SALTING_BATCH (절임 배치)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_SALTING_BATCH (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_no             VARCHAR(20)   NOT NULL UNIQUE COMMENT 'SALT-YYYYMMDD-NNN',
    work_order_id        BIGINT        NOT NULL,
    lot_no               VARCHAR(30)   NOT NULL,
    material_type        VARCHAR(20)   NOT NULL,
    input_weight_kg      DECIMAL(10,2) NOT NULL,
    brine_concentration  DECIMAL(5,2)  NOT NULL COMMENT '염수농도(%)',
    start_time           DATETIME      NOT NULL,
    end_time             DATETIME      NULL,
    elapsed_hours        DECIMAL(5,2)  NULL COMMENT '절임 소요시간',
    salinity_after       DECIMAL(5,2)  NULL COMMENT '절임 후 염도(%)',
    rinse_count          SMALLINT      NOT NULL DEFAULT 3,
    output_weight_kg     DECIMAL(10,2) NULL,
    ccp_pass             TINYINT(1)    NOT NULL DEFAULT 1,
    status               VARCHAR(20)   NOT NULL DEFAULT 'IN_PROGRESS',
    remarks              TEXT          NULL,
    created_by           VARCHAR(50)   NOT NULL,
    created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted           TINYINT(1)    NOT NULL DEFAULT 0,
    INDEX idx_sb_status (status),
    INDEX idx_sb_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='절임배치';

-- ============================================================
-- TB_SALTING_CONCENTRATION_LOG (절임 농도 측정 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_SALTING_CONCENTRATION_LOG (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id             BIGINT        NOT NULL,
    measured_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    concentration        DECIMAL(5,2)  NOT NULL,
    temperature          DECIMAL(5,1)  NULL,
    ph                   DECIMAL(4,2)  NULL,
    ccp_pass             TINYINT(1)    NOT NULL DEFAULT 1,
    measured_by          VARCHAR(50)   NOT NULL,
    corrective_action    TEXT          NULL,
    INDEX idx_scl_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='절임농도측정이력';
