-- ============================================================
-- 임진강김치 MES 시스템 - 기준정보 스키마
-- Sprint 1 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- TB_COMMON_CODE (공통코드)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_COMMON_CODE (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_code  VARCHAR(20)  NOT NULL COMMENT '그룹코드',
    code        VARCHAR(20)  NOT NULL COMMENT '코드',
    code_name   VARCHAR(100) NOT NULL COMMENT '코드명',
    code_name_en VARCHAR(100)         COMMENT '코드명(영문)',
    sort_order  INT          DEFAULT 0,
    is_active   TINYINT(1)   DEFAULT 1,
    description VARCHAR(500),
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(50),
    is_deleted  TINYINT(1)   DEFAULT 0,
    UNIQUE KEY uk_group_code (group_code, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='공통코드';

-- ============================================================
-- TB_ROLE (역할)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_ROLE (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_code   VARCHAR(20)  NOT NULL UNIQUE COMMENT '역할코드',
    role_name   VARCHAR(100) NOT NULL COMMENT '역할명',
    description VARCHAR(500) COMMENT '설명',
    is_active   TINYINT(1)   DEFAULT 1,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(50),
    is_deleted  TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='역할';

-- ============================================================
-- TB_USER (사용자/작업자)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_USER (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(50)  NOT NULL UNIQUE COMMENT '사용자ID',
    user_name       VARCHAR(100) NOT NULL COMMENT '사용자명',
    password_hash   VARCHAR(255) NOT NULL,
    department      VARCHAR(100) COMMENT '부서',
    position        VARCHAR(100) COMMENT '직책',
    phone           VARCHAR(20),
    email           VARCHAR(100),
    is_active       TINYINT(1)   DEFAULT 1,
    last_login_at   DATETIME,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자';

-- ============================================================
-- TB_USER_ROLE (사용자-역할 매핑)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_USER_ROLE (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL COMMENT 'TB_USER.id',
    role_id     BIGINT NOT NULL COMMENT 'TB_ROLE.id',
    granted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by  VARCHAR(50),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(50),
    is_deleted  TINYINT(1) DEFAULT 0,
    UNIQUE KEY uk_user_role (user_id, role_id),
    FOREIGN KEY fk_ur_user (user_id) REFERENCES TB_USER(id),
    FOREIGN KEY fk_ur_role (role_id) REFERENCES TB_ROLE(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자-역할 매핑';

-- ============================================================
-- TB_CUSTOMER (거래처)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_CUSTOMER (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_code    VARCHAR(20)  NOT NULL UNIQUE COMMENT '거래처코드',
    customer_name    VARCHAR(200) NOT NULL COMMENT '거래처명',
    customer_type    VARCHAR(20)  DEFAULT 'GENERAL' COMMENT 'HOMESHOPPING/GENERAL/ONLINE',
    business_no      VARCHAR(20)  COMMENT '사업자번호',
    representative   VARCHAR(100) COMMENT '대표자',
    phone            VARCHAR(20),
    fax              VARCHAR(20),
    email            VARCHAR(100),
    address          VARCHAR(500) COMMENT '주소',
    delivery_address VARCHAR(500) COMMENT '납품처 기본 주소',
    payment_terms    VARCHAR(100) COMMENT '결제조건',
    credit_limit     DECIMAL(15,2) COMMENT '신용한도',
    is_active        TINYINT(1)   DEFAULT 1,
    notes            VARCHAR(1000),
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='거래처';

-- ============================================================
-- TB_PRODUCT (제품품목기준)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_PRODUCT (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_code    VARCHAR(20)   NOT NULL UNIQUE COMMENT '제품코드',
    product_name    VARCHAR(200)  NOT NULL COMMENT '제품명',
    product_type    VARCHAR(20)   NOT NULL COMMENT '제품유형: BAECHU/CHONGGAK/YEOLMU/OTHER',
    capacity        DECIMAL(10,2) NOT NULL COMMENT '용량(kg)',
    package_unit    VARCHAR(50)   COMMENT '포장단위',
    channel_type    VARCHAR(20)   DEFAULT 'GENERAL' COMMENT 'HOMESHOPPING/GENERAL/BOTH',
    unit_price      DECIMAL(12,2) COMMENT '단가',
    shelf_life_days INT           COMMENT '유통기한(일)',
    description     VARCHAR(500),
    is_active       TINYINT(1)   DEFAULT 1,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='제품품목기준';

-- ============================================================
-- TB_RAW_MATERIAL (원부자재기준)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_RAW_MATERIAL (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    material_code   VARCHAR(20)   NOT NULL UNIQUE COMMENT '자재코드',
    material_name   VARCHAR(200)  NOT NULL COMMENT '자재명',
    material_type   VARCHAR(20)   COMMENT '자재유형: RAW(원재료)/SUB(부재료)/PACKAGING(포장재)',
    unit            VARCHAR(20)   DEFAULT 'kg' COMMENT '단위',
    unit_price      DECIMAL(12,2) COMMENT '단가',
    supplier        VARCHAR(200)  COMMENT '주 공급업체',
    min_stock_qty   DECIMAL(12,2) DEFAULT 0 COMMENT '최소재고량',
    is_active       TINYINT(1)   DEFAULT 1,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='원부자재기준';

-- ============================================================
-- TB_BOM (레시피 BOM 헤더)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_BOM (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    bom_code       VARCHAR(20)   NOT NULL UNIQUE COMMENT 'BOM코드',
    product_id     BIGINT        NOT NULL COMMENT 'TB_PRODUCT.id',
    bom_name       VARCHAR(200)  NOT NULL COMMENT 'BOM명',
    total_qty      DECIMAL(12,2) NOT NULL COMMENT '기준생산량(kg)',
    version        VARCHAR(10)   DEFAULT '1.0' COMMENT 'BOM 버전',
    is_active      TINYINT(1)   DEFAULT 1,
    effective_date DATE          COMMENT '적용일자',
    description    VARCHAR(500),
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by     VARCHAR(50),
    is_deleted     TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_bom_product (product_id) REFERENCES TB_PRODUCT(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='레시피BOM헤더';

-- ============================================================
-- TB_BOM_DETAIL (BOM 명세)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_BOM_DETAIL (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    bom_id           BIGINT        NOT NULL COMMENT 'TB_BOM.id',
    raw_material_id  BIGINT        NOT NULL COMMENT 'TB_RAW_MATERIAL.id',
    required_qty     DECIMAL(12,4) NOT NULL COMMENT '소요량(kg)',
    loss_rate        DECIMAL(5,2)  DEFAULT 0 COMMENT '손실률(%)',
    sequence         INT           DEFAULT 0 COMMENT '투입순서',
    notes            VARCHAR(500),
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)    DEFAULT 0,
    FOREIGN KEY fk_bomd_bom  (bom_id)          REFERENCES TB_BOM(id),
    FOREIGN KEY fk_bomd_mat  (raw_material_id)  REFERENCES TB_RAW_MATERIAL(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='레시피BOM명세';

-- ============================================================
-- TB_PROCESS (공정기준)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_PROCESS (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    process_code  VARCHAR(20)  NOT NULL UNIQUE COMMENT '공정코드',
    process_name  VARCHAR(100) NOT NULL COMMENT '공정명',
    process_type  VARCHAR(20)  NOT NULL COMMENT '공정유형 (COMMON_CODE: PROCESS_TYPE)',
    sequence      INT          DEFAULT 0 COMMENT '공정순서',
    description   VARCHAR(500),
    is_active     TINYINT(1)   DEFAULT 1,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by    VARCHAR(50),
    is_deleted    TINYINT(1)   DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='공정기준';

-- ============================================================
-- TB_CCP_STANDARD (CCP 기준값 - HACCP 관리점)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_CCP_STANDARD (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    process_id      BIGINT        NOT NULL COMMENT 'TB_PROCESS.id',
    ccp_code        VARCHAR(20)   NOT NULL UNIQUE COMMENT 'CCP코드',
    ccp_name        VARCHAR(200)  NOT NULL COMMENT 'CCP명',
    control_item    VARCHAR(200)  COMMENT '관리항목 (온도/pH/염도 등)',
    min_value       DECIMAL(10,4) COMMENT '최솟값',
    max_value       DECIMAL(10,4) COMMENT '최댓값',
    target_value    DECIMAL(10,4) COMMENT '목표값',
    unit            VARCHAR(20)   COMMENT '단위 (°C/%/ppm 등)',
    action_limit    VARCHAR(200)  COMMENT '한계기준 초과 시 조치사항',
    monitoring_freq VARCHAR(100)  COMMENT '모니터링 주기',
    is_active       TINYINT(1)   DEFAULT 1,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    is_deleted      TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_ccp_process (process_id) REFERENCES TB_PROCESS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CCP기준값(HACCP 관리점)';

-- ============================================================
-- TB_EQUIPMENT (설비/탱크기준)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_EQUIPMENT (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipment_code   VARCHAR(20)   NOT NULL UNIQUE COMMENT '설비코드',
    equipment_name   VARCHAR(200)  NOT NULL COMMENT '설비명',
    equipment_type   VARCHAR(20)   COMMENT '설비유형 (TANK/LINE/MACHINE 등)',
    process_id       BIGINT        COMMENT 'TB_PROCESS.id (담당 공정)',
    capacity         DECIMAL(12,2) COMMENT '용량(kg)',
    location         VARCHAR(200)  COMMENT '설치위치',
    manufacturer     VARCHAR(200)  COMMENT '제조사',
    model_no         VARCHAR(100)  COMMENT '모델번호',
    install_date     DATE          COMMENT '설치일자',
    last_inspect_date DATE         COMMENT '최근 점검일',
    next_inspect_date DATE         COMMENT '차기 점검 예정일',
    status           VARCHAR(20)   DEFAULT 'ACTIVE' COMMENT 'ACTIVE/MAINTENANCE/INACTIVE',
    is_active        TINYINT(1)   DEFAULT 1,
    notes            VARCHAR(500),
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    is_deleted       TINYINT(1)   DEFAULT 0,
    FOREIGN KEY fk_equip_process (process_id) REFERENCES TB_PROCESS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='설비/탱크기준';
