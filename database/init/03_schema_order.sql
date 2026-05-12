-- ============================================================
-- 임진강김치 MES 시스템 - 수주/생산 스키마
-- Sprint 1 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- TB_ORDER (수주)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_ORDER (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no         VARCHAR(20)   NOT NULL UNIQUE COMMENT '수주번호 (ORD-YYYYMMDD-NNN)',
    customer_id      BIGINT        NOT NULL COMMENT 'TB_CUSTOMER.id',
    order_date       DATE          NOT NULL COMMENT '수주일',
    delivery_date    DATE          NOT NULL COMMENT '납기일',
    order_type       VARCHAR(20)   DEFAULT 'GENERAL' COMMENT 'HOMESHOPPING/GENERAL',
    status           VARCHAR(20)   DEFAULT 'DRAFT'
                                   COMMENT '상태: DRAFT/CONFIRMED/IN_PRODUCTION/SHIPPED/COMPLETED/CANCELLED',
    total_qty        DECIMAL(12,2) COMMENT '총 수량(kg)',
    total_amount     DECIMAL(15,2) COMMENT '총 금액',
    delivery_address VARCHAR(500)  COMMENT '납품처 주소',
    remark           VARCHAR(1000) COMMENT '비고',
    confirmed_at     DATETIME      COMMENT '수주 확정일시',
    confirmed_by     VARCHAR(50)   COMMENT '확정 처리자',
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_ord_customer (customer_id) REFERENCES TB_CUSTOMER(id),
    INDEX idx_order_date   (order_date),
    INDEX idx_order_status (status),
    INDEX idx_order_delivery (delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='수주';

-- ============================================================
-- TB_ORDER_DETAIL (수주상세)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_ORDER_DETAIL (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id      BIGINT        NOT NULL COMMENT 'TB_ORDER.id',
    product_id    BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    order_qty     DECIMAL(12,2) NOT NULL COMMENT '수주수량(단위: 개/박스)',
    unit_price    DECIMAL(12,2) COMMENT '단가',
    amount        DECIMAL(15,2) COMMENT '금액',
    delivery_date DATE          COMMENT '납기일 (상세 재정의 가능)',
    status        VARCHAR(20)   DEFAULT 'PENDING'
                               COMMENT '상태: PENDING/IN_PRODUCTION/SHIPPED/COMPLETED',
    shipped_qty   DECIMAL(12,2) DEFAULT 0 COMMENT '출하완료 수량',
    notes         VARCHAR(500),
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by    VARCHAR(50),
    is_deleted    TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_ordd_order   (order_id)   REFERENCES TB_ORDER(id),
    FOREIGN KEY fk_ordd_product (product_id) REFERENCES TB_PRODUCT(id),
    INDEX idx_ordd_order (order_id),
    INDEX idx_ordd_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='수주상세';

-- ============================================================
-- TB_ORDER_HISTORY (수주 변경이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_ORDER_HISTORY (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id      BIGINT        NOT NULL COMMENT 'TB_ORDER.id',
    changed_field VARCHAR(100)  NOT NULL COMMENT '변경 필드명',
    old_value     VARCHAR(500)  COMMENT '변경 전 값',
    new_value     VARCHAR(500)  COMMENT '변경 후 값',
    change_reason VARCHAR(500)  COMMENT '변경 사유',
    changed_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    changed_by    VARCHAR(50),
    FOREIGN KEY fk_ordh_order (order_id) REFERENCES TB_ORDER(id),
    INDEX idx_ordh_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='수주변경이력';

-- ============================================================
-- TB_PRODUCTION_PLAN (생산계획)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_PRODUCTION_PLAN (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_no        VARCHAR(20)   NOT NULL UNIQUE COMMENT '계획번호 (PLAN-YYYYMMDD-NNN)',
    plan_date      DATE          NOT NULL COMMENT '계획일',
    order_id       BIGINT        COMMENT 'TB_ORDER.id (연계 수주, NULL 가능)',
    product_id     BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    bom_id         BIGINT        COMMENT 'TB_BOM.id (사용 BOM)',
    planned_qty    DECIMAL(12,2) NOT NULL COMMENT '계획수량(kg)',
    actual_qty     DECIMAL(12,2) DEFAULT 0 COMMENT '실적수량(kg)',
    status         VARCHAR(20)   DEFAULT 'DRAFT'
                                COMMENT '상태: DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED',
    plan_type      VARCHAR(20)   DEFAULT 'DAILY' COMMENT '계획유형: DAILY/WEEKLY',
    start_datetime DATETIME      COMMENT '생산 시작 예정일시',
    end_datetime   DATETIME      COMMENT '생산 종료 예정일시',
    remark         VARCHAR(500),
    created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by     VARCHAR(50),
    is_deleted     TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_pp_order   (order_id)   REFERENCES TB_ORDER(id),
    FOREIGN KEY fk_pp_product (product_id) REFERENCES TB_PRODUCT(id),
    FOREIGN KEY fk_pp_bom     (bom_id)     REFERENCES TB_BOM(id),
    INDEX idx_pp_date    (plan_date),
    INDEX idx_pp_status  (status),
    INDEX idx_pp_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='생산계획';

-- ============================================================
-- TB_WORK_ORDER (작업지시서)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_WORK_ORDER (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_no       VARCHAR(20)   NOT NULL UNIQUE COMMENT '작업지시번호 (WO-YYYYMMDD-NNN)',
    production_plan_id  BIGINT        NOT NULL COMMENT 'TB_PRODUCTION_PLAN.id',
    product_id          BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    bom_id              BIGINT        COMMENT 'TB_BOM.id',
    process_id          BIGINT        COMMENT 'TB_PROCESS.id (담당 공정)',
    equipment_id        BIGINT        COMMENT 'TB_EQUIPMENT.id (사용 설비)',
    assigned_user_id    BIGINT        COMMENT 'TB_USER.id (작업 담당자)',
    work_date           DATE          NOT NULL COMMENT '작업일',
    planned_qty         DECIMAL(12,2) NOT NULL COMMENT '지시수량(kg)',
    actual_qty          DECIMAL(12,2) DEFAULT 0 COMMENT '실적수량(kg)',
    defect_qty          DECIMAL(12,2) DEFAULT 0 COMMENT '불량수량(kg)',
    status              VARCHAR(20)   DEFAULT 'ISSUED'
                                     COMMENT '상태: ISSUED/IN_PROGRESS/PAUSED/COMPLETED/CANCELLED',
    start_datetime      DATETIME      COMMENT '실제 작업 시작일시',
    end_datetime        DATETIME      COMMENT '실제 작업 종료일시',
    planned_start       DATETIME      COMMENT '계획 시작일시',
    planned_end         DATETIME      COMMENT '계획 종료일시',
    lot_no              VARCHAR(30)   COMMENT '생산 LOT 번호',
    remark              VARCHAR(500),
    issued_at           DATETIME      COMMENT '지시 발행일시',
    issued_by           VARCHAR(50)   COMMENT '지시 발행자',
    completed_at        DATETIME      COMMENT '작업완료 확인일시',
    completed_by        VARCHAR(50)   COMMENT '작업완료 확인자',
    created_at          DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(50),
    is_deleted          TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_wo_plan     (production_plan_id) REFERENCES TB_PRODUCTION_PLAN(id),
    FOREIGN KEY fk_wo_product  (product_id)         REFERENCES TB_PRODUCT(id),
    FOREIGN KEY fk_wo_bom      (bom_id)             REFERENCES TB_BOM(id),
    FOREIGN KEY fk_wo_process  (process_id)         REFERENCES TB_PROCESS(id),
    FOREIGN KEY fk_wo_equip    (equipment_id)       REFERENCES TB_EQUIPMENT(id),
    FOREIGN KEY fk_wo_user     (assigned_user_id)   REFERENCES TB_USER(id),
    INDEX idx_wo_date    (work_date),
    INDEX idx_wo_status  (status),
    INDEX idx_wo_lot     (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='작업지시서';

-- ============================================================
-- TB_WORK_ORDER_RESULT (작업실적)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_WORK_ORDER_RESULT (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id   BIGINT        NOT NULL COMMENT 'TB_WORK_ORDER.id',
    result_seq      INT           DEFAULT 1 COMMENT '실적 순번 (분할 입력 시)',
    actual_qty      DECIMAL(12,2) NOT NULL COMMENT '실적수량(kg)',
    defect_qty      DECIMAL(12,2) DEFAULT 0 COMMENT '불량수량(kg)',
    defect_reason   VARCHAR(200)  COMMENT '불량사유',
    recorded_at     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '실적 기록일시',
    recorded_by     VARCHAR(50)   COMMENT '실적 입력자',
    notes           VARCHAR(500),
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_wor_wo (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_wor_wo (work_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='작업실적';

-- ============================================================
-- TB_QC_RECORD (품질검사 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_QC_RECORD (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_order_id   BIGINT        COMMENT 'TB_WORK_ORDER.id',
    process_id      BIGINT        NOT NULL COMMENT 'TB_PROCESS.id',
    ccp_standard_id BIGINT        COMMENT 'TB_CCP_STANDARD.id',
    lot_no          VARCHAR(30)   COMMENT 'LOT 번호',
    measured_value  DECIMAL(12,4) COMMENT '측정값',
    unit            VARCHAR(20)   COMMENT '단위',
    is_pass         TINYINT(1)    COMMENT '합격여부 (1=합격/0=불합격)',
    action_taken    VARCHAR(500)  COMMENT '조치내용 (불합격 시)',
    inspected_at    DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '검사일시',
    inspected_by    VARCHAR(50)   COMMENT '검사자',
    notes           VARCHAR(500),
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_qc_wo  (work_order_id)   REFERENCES TB_WORK_ORDER(id),
    FOREIGN KEY fk_qc_prc (process_id)      REFERENCES TB_PROCESS(id),
    FOREIGN KEY fk_qc_ccp (ccp_standard_id) REFERENCES TB_CCP_STANDARD(id),
    INDEX idx_qc_lot (lot_no),
    INDEX idx_qc_process (process_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='품질검사기록';
