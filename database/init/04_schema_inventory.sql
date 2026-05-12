-- ============================================================
-- 임진강김치 MES 시스템 - 재고 스키마
-- Sprint 1 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- TB_WAREHOUSE (창고/저장소)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_WAREHOUSE (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    warehouse_code  VARCHAR(20)   NOT NULL UNIQUE COMMENT '창고코드',
    warehouse_name  VARCHAR(200)  NOT NULL COMMENT '창고명',
    warehouse_type  VARCHAR(20)   DEFAULT 'MATERIAL'
                                 COMMENT '창고유형: MATERIAL(자재)/PRODUCT(제품)/COLD(냉장)/FREEZE(냉동)',
    location        VARCHAR(200)  COMMENT '위치',
    capacity        DECIMAL(12,2) COMMENT '보관용량(kg)',
    temp_control    TINYINT(1)   DEFAULT 0 COMMENT '온도관리여부',
    min_temp        DECIMAL(5,2)  COMMENT '최소보관온도(°C)',
    max_temp        DECIMAL(5,2)  COMMENT '최대보관온도(°C)',
    is_active       TINYINT(1)   DEFAULT 1,
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='창고/저장소';

-- ============================================================
-- TB_MATERIAL_STOCK (원부자재 재고 현황)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_MATERIAL_STOCK (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    raw_material_id BIGINT        NOT NULL COMMENT 'TB_RAW_MATERIAL.id',
    warehouse_id    BIGINT        NOT NULL COMMENT 'TB_WAREHOUSE.id',
    lot_no          VARCHAR(30)   COMMENT '입고 LOT 번호',
    current_qty     DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '현재 재고수량(kg)',
    unit            VARCHAR(20)   DEFAULT 'kg',
    unit_price      DECIMAL(12,2) COMMENT '입고단가',
    receive_date    DATE          COMMENT '입고일',
    expiry_date     DATE          COMMENT '유통기한',
    supplier        VARCHAR(200)  COMMENT '공급업체',
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_ms_material  (raw_material_id) REFERENCES TB_RAW_MATERIAL(id),
    FOREIGN KEY fk_ms_warehouse (warehouse_id)    REFERENCES TB_WAREHOUSE(id),
    INDEX idx_ms_material  (raw_material_id),
    INDEX idx_ms_warehouse (warehouse_id),
    INDEX idx_ms_lot       (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='원부자재 재고현황';

-- ============================================================
-- TB_MATERIAL_TRANSACTION (원부자재 입출고 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_MATERIAL_TRANSACTION (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    raw_material_id  BIGINT        NOT NULL COMMENT 'TB_RAW_MATERIAL.id',
    warehouse_id     BIGINT        NOT NULL COMMENT 'TB_WAREHOUSE.id',
    trans_type       VARCHAR(20)   NOT NULL
                                   COMMENT '거래유형: IN(입고)/OUT(출고)/ADJUST(조정)/RETURN(반품)',
    trans_date       DATE          NOT NULL COMMENT '거래일',
    trans_qty        DECIMAL(12,2) NOT NULL COMMENT '거래수량(kg) - 부호포함 (출고 시 음수)',
    before_qty       DECIMAL(12,2) COMMENT '거래 전 재고',
    after_qty        DECIMAL(12,2) COMMENT '거래 후 재고',
    unit_price       DECIMAL(12,2) COMMENT '단가',
    lot_no           VARCHAR(30)   COMMENT 'LOT 번호',
    work_order_id    BIGINT        COMMENT 'TB_WORK_ORDER.id (작업지시 연계)',
    ref_no           VARCHAR(50)   COMMENT '참조번호 (입고전표/출고전표 등)',
    reason           VARCHAR(200)  COMMENT '거래사유',
    notes            VARCHAR(500),
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_mt_material  (raw_material_id) REFERENCES TB_RAW_MATERIAL(id),
    FOREIGN KEY fk_mt_warehouse (warehouse_id)    REFERENCES TB_WAREHOUSE(id),
    FOREIGN KEY fk_mt_wo        (work_order_id)   REFERENCES TB_WORK_ORDER(id),
    INDEX idx_mt_date      (trans_date),
    INDEX idx_mt_material  (raw_material_id),
    INDEX idx_mt_type      (trans_type),
    INDEX idx_mt_lot       (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='원부자재 입출고이력';

-- ============================================================
-- TB_PRODUCT_STOCK (완제품 재고 현황)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_PRODUCT_STOCK (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id      BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    warehouse_id    BIGINT        NOT NULL COMMENT 'TB_WAREHOUSE.id',
    lot_no          VARCHAR(30)   COMMENT '생산 LOT 번호',
    current_qty     DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '현재 재고수량(박스/개)',
    production_date DATE          COMMENT '생산일',
    expiry_date     DATE          COMMENT '유통기한',
    work_order_id   BIGINT        COMMENT 'TB_WORK_ORDER.id (생산된 작업지시)',
    unit_price      DECIMAL(12,2) COMMENT '단가',
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_ps_product   (product_id)    REFERENCES TB_PRODUCT(id),
    FOREIGN KEY fk_ps_warehouse (warehouse_id)  REFERENCES TB_WAREHOUSE(id),
    FOREIGN KEY fk_ps_wo        (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_ps_product   (product_id),
    INDEX idx_ps_lot       (lot_no),
    INDEX idx_ps_expiry    (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='완제품 재고현황';

-- ============================================================
-- TB_PRODUCT_TRANSACTION (완제품 입출고 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_PRODUCT_TRANSACTION (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id      BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    warehouse_id    BIGINT        NOT NULL COMMENT 'TB_WAREHOUSE.id',
    trans_type      VARCHAR(20)   NOT NULL
                                  COMMENT '거래유형: IN(입고)/OUT(출고/출하)/ADJUST(조정)/RETURN(반품)',
    trans_date      DATE          NOT NULL COMMENT '거래일',
    trans_qty       DECIMAL(12,2) NOT NULL COMMENT '거래수량 - 부호포함',
    before_qty      DECIMAL(12,2) COMMENT '거래 전 재고',
    after_qty       DECIMAL(12,2) COMMENT '거래 후 재고',
    lot_no          VARCHAR(30)   COMMENT 'LOT 번호',
    order_id        BIGINT        COMMENT 'TB_ORDER.id (출하 시 연계 수주)',
    work_order_id   BIGINT        COMMENT 'TB_WORK_ORDER.id (입고 시 연계 작업지시)',
    ref_no          VARCHAR(50)   COMMENT '참조번호',
    reason          VARCHAR(200)  COMMENT '거래사유',
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_pt_product   (product_id)    REFERENCES TB_PRODUCT(id),
    FOREIGN KEY fk_pt_warehouse (warehouse_id)  REFERENCES TB_WAREHOUSE(id),
    FOREIGN KEY fk_pt_order     (order_id)      REFERENCES TB_ORDER(id),
    FOREIGN KEY fk_pt_wo        (work_order_id) REFERENCES TB_WORK_ORDER(id),
    INDEX idx_pt_date     (trans_date),
    INDEX idx_pt_product  (product_id),
    INDEX idx_pt_type     (trans_type),
    INDEX idx_pt_lot      (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='완제품 입출고이력';

-- ============================================================
-- TB_MATERIAL_RECEIVE (원자재 입고)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_MATERIAL_RECEIVE (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receive_no      VARCHAR(20)   NOT NULL UNIQUE COMMENT '입고번호 (RCV-YYYYMMDD-NNN)',
    raw_material_id BIGINT        NOT NULL COMMENT 'TB_RAW_MATERIAL.id',
    warehouse_id    BIGINT        NOT NULL COMMENT 'TB_WAREHOUSE.id',
    receive_date    DATE          NOT NULL COMMENT '입고일',
    receive_qty     DECIMAL(12,2) NOT NULL COMMENT '입고수량(kg)',
    unit_price      DECIMAL(12,2) COMMENT '입고단가',
    amount          DECIMAL(15,2) COMMENT '입고금액',
    lot_no          VARCHAR(30)   COMMENT 'LOT 번호',
    supplier        VARCHAR(200)  COMMENT '공급업체',
    expiry_date     DATE          COMMENT '유통기한',
    qc_status       VARCHAR(20)   DEFAULT 'PENDING'
                                  COMMENT '검사상태: PENDING/PASS/FAIL/SKIP',
    qc_notes        VARCHAR(500)  COMMENT '검사결과 비고',
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_mr_material  (raw_material_id) REFERENCES TB_RAW_MATERIAL(id),
    FOREIGN KEY fk_mr_warehouse (warehouse_id)    REFERENCES TB_WAREHOUSE(id),
    INDEX idx_mr_date     (receive_date),
    INDEX idx_mr_material (raw_material_id),
    INDEX idx_mr_lot      (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='원자재 입고';

-- ============================================================
-- TB_SHIPMENT (출하)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_SHIPMENT (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_no     VARCHAR(20)   NOT NULL UNIQUE COMMENT '출하번호 (SHP-YYYYMMDD-NNN)',
    order_id        BIGINT        COMMENT 'TB_ORDER.id (연계 수주)',
    customer_id     BIGINT        NOT NULL COMMENT 'TB_CUSTOMER.id',
    shipment_date   DATE          NOT NULL COMMENT '출하일',
    status          VARCHAR(20)   DEFAULT 'READY'
                                  COMMENT '상태: READY/SHIPPED/DELIVERED/RETURNED',
    delivery_address VARCHAR(500) COMMENT '납품처 주소',
    driver_name     VARCHAR(100)  COMMENT '운전자명',
    vehicle_no      VARCHAR(20)   COMMENT '차량번호',
    total_qty       DECIMAL(12,2) COMMENT '총 출하수량',
    total_amount    DECIMAL(15,2) COMMENT '총 출하금액',
    shipped_at      DATETIME      COMMENT '실제 출하일시',
    delivered_at    DATETIME      COMMENT '배달 확인일시',
    notes           VARCHAR(500),
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_shp_order    (order_id)    REFERENCES TB_ORDER(id),
    FOREIGN KEY fk_shp_customer (customer_id) REFERENCES TB_CUSTOMER(id),
    INDEX idx_shp_date   (shipment_date),
    INDEX idx_shp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='출하';

-- ============================================================
-- TB_SHIPMENT_DETAIL (출하 상세)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_SHIPMENT_DETAIL (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_id      BIGINT        NOT NULL COMMENT 'TB_SHIPMENT.id',
    product_id       BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    order_detail_id  BIGINT        COMMENT 'TB_ORDER_DETAIL.id',
    lot_no           VARCHAR(30)   COMMENT 'LOT 번호',
    ship_qty         DECIMAL(12,2) NOT NULL COMMENT '출하수량',
    unit_price       DECIMAL(12,2) COMMENT '단가',
    amount           DECIMAL(15,2) COMMENT '금액',
    expiry_date      DATE          COMMENT '유통기한',
    notes            VARCHAR(500),
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_shpd_shipment     (shipment_id)     REFERENCES TB_SHIPMENT(id),
    FOREIGN KEY fk_shpd_product      (product_id)      REFERENCES TB_PRODUCT(id),
    FOREIGN KEY fk_shpd_order_detail (order_detail_id) REFERENCES TB_ORDER_DETAIL(id),
    INDEX idx_shpd_shipment (shipment_id),
    INDEX idx_shpd_lot      (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='출하상세';
