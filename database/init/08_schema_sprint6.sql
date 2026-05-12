-- Sprint 6: LOT 추적, 알림, OEE 테이블
-- 생성일: 2026-05-12

-- TB_LOT_TRACE: LOT 추적 이력
CREATE TABLE IF NOT EXISTS TB_LOT_TRACE (
  id BIGINT NOT NULL AUTO_INCREMENT,
  lot_no VARCHAR(50) NOT NULL COMMENT 'LOT 번호',
  trace_type VARCHAR(30) NOT NULL COMMENT '이력 유형: RECEIVE/PRODUCTION/PROCESS/SHIPMENT/QC',
  trace_date DATETIME NOT NULL COMMENT '이력 발생일시',
  ref_table VARCHAR(50) COMMENT '참조 테이블명 (TB_MATERIAL_RECEIVE 등)',
  ref_id BIGINT COMMENT '참조 레코드 ID',
  product_id BIGINT COMMENT '제품 ID (FK → TB_PRODUCT)',
  raw_material_id BIGINT COMMENT '원재료 ID (FK → TB_RAW_MATERIAL)',
  work_order_id BIGINT COMMENT '작업지시 ID (FK → TB_WORK_ORDER)',
  quantity DECIMAL(15,3) COMMENT '수량',
  unit VARCHAR(20) COMMENT '단위',
  warehouse_id BIGINT COMMENT '창고 ID (FK → TB_WAREHOUSE)',
  process_name VARCHAR(100) COMMENT '공정명',
  description TEXT COMMENT '이력 설명',
  operator VARCHAR(50) COMMENT '작업자',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_lot_no (lot_no),
  INDEX idx_trace_date (trace_date),
  INDEX idx_trace_type (trace_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='LOT 추적 이력 테이블';

-- TB_NOTIFICATION: 알림
CREATE TABLE IF NOT EXISTS TB_NOTIFICATION (
  id BIGINT NOT NULL AUTO_INCREMENT,
  notification_type VARCHAR(50) NOT NULL COMMENT '알림 유형: STOCK_LOW/CCP_VIOLATION/EQUIPMENT_FAILURE/DELIVERY_RISK/SYSTEM',
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO' COMMENT '심각도: INFO/WARNING/DANGER',
  title VARCHAR(200) NOT NULL COMMENT '알림 제목',
  message TEXT COMMENT '알림 내용',
  ref_table VARCHAR(50) COMMENT '관련 테이블',
  ref_id BIGINT COMMENT '관련 레코드 ID',
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '읽음 여부',
  read_at DATETIME COMMENT '읽은 일시',
  read_by VARCHAR(50) COMMENT '읽은 사용자',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_is_read (is_read),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='알림 테이블';

-- TB_OEE_RECORD: 설비종합효율 기록
CREATE TABLE IF NOT EXISTS TB_OEE_RECORD (
  id BIGINT NOT NULL AUTO_INCREMENT,
  equipment_id BIGINT NOT NULL COMMENT '설비 ID (FK → TB_EQUIPMENT)',
  record_date DATE NOT NULL COMMENT '기록 일자',
  planned_time INT NOT NULL DEFAULT 480 COMMENT '계획 가동 시간 (분, 기본 8시간)',
  downtime INT NOT NULL DEFAULT 0 COMMENT '비가동 시간 (분)',
  actual_time INT NOT NULL DEFAULT 0 COMMENT '실 가동 시간 (분)',
  ideal_cycle_time DECIMAL(10,3) COMMENT '이상 사이클 타임 (초/개)',
  total_count INT NOT NULL DEFAULT 0 COMMENT '총 생산 수량',
  good_count INT NOT NULL DEFAULT 0 COMMENT '양품 수량',
  defect_count INT NOT NULL DEFAULT 0 COMMENT '불량 수량',
  availability DECIMAL(5,2) COMMENT '가용률 (%)',
  performance DECIMAL(5,2) COMMENT '성능률 (%)',
  quality DECIMAL(5,2) COMMENT '양품률 (%)',
  oee DECIMAL(5,2) COMMENT 'OEE = 가용률 × 성능률 × 양품률 (%)',
  notes TEXT COMMENT '비고',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_equipment_date (equipment_id, record_date),
  INDEX idx_record_date (record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OEE 기록 테이블';
