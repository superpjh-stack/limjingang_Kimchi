-- Sprint 4: 설비 확장(점검·고장) + 시스템 감사 로그 테이블
USE mes_db;

-- ============================================================
-- 설비 점검 계획/이력 (TB_EQUIPMENT_INSPECTION)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_EQUIPMENT_INSPECTION (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipment_id        BIGINT        NOT NULL COMMENT 'TB_EQUIPMENT.id',
    inspection_type     VARCHAR(20)   NOT NULL COMMENT '점검유형: DAILY/WEEKLY/MONTHLY/SPECIAL/EMERGENCY',
    scheduled_date      DATE          NOT NULL COMMENT '점검 예정일',
    actual_date         DATE          COMMENT '실제 점검일',
    inspector           VARCHAR(100)  COMMENT '점검자',
    status              VARCHAR(20)   DEFAULT 'SCHEDULED'
                                      COMMENT '상태: SCHEDULED/COMPLETED/SKIPPED/OVERDUE',
    result              VARCHAR(20)   COMMENT '결과: PASS/FAIL/CONDITIONAL',
    findings            TEXT          COMMENT '점검 내용/발견사항',
    actions_taken       TEXT          COMMENT '조치 내용',
    next_scheduled_date DATE          COMMENT '다음 점검 예정일',
    notes               VARCHAR(500),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(50),
    updated_by          VARCHAR(50),
    is_deleted          TINYINT(1) DEFAULT 0,
    FOREIGN KEY fk_insp_equip (equipment_id) REFERENCES TB_EQUIPMENT(id),
    INDEX idx_insp_equip  (equipment_id),
    INDEX idx_insp_date   (scheduled_date),
    INDEX idx_insp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='설비점검';

-- ============================================================
-- 설비 고장 기록 (TB_EQUIPMENT_FAILURE)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_EQUIPMENT_FAILURE (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipment_id    BIGINT        NOT NULL COMMENT 'TB_EQUIPMENT.id',
    failure_no      VARCHAR(20)   NOT NULL UNIQUE COMMENT '고장번호 (FL-YYYYMMDD-NNN)',
    failure_date    DATETIME      NOT NULL COMMENT '고장 발생일시',
    failure_type    VARCHAR(50)   COMMENT '고장유형: MECHANICAL/ELECTRICAL/SENSOR/SOFTWARE/OTHER',
    symptoms        TEXT          NOT NULL COMMENT '고장 증상',
    cause           TEXT          COMMENT '고장 원인',
    impact_level    VARCHAR(20)   DEFAULT 'MEDIUM'
                                  COMMENT '영향도: LOW/MEDIUM/HIGH/CRITICAL',
    status          VARCHAR(20)   DEFAULT 'OPEN'
                                  COMMENT '상태: OPEN/IN_REPAIR/RESOLVED/DEFERRED',
    resolved_date   DATETIME      COMMENT '복구 완료일시',
    repair_notes    TEXT          COMMENT '수리 내용',
    downtime_hours  DECIMAL(8,2)  COMMENT '가동중지 시간(시간)',
    repaired_by     VARCHAR(100)  COMMENT '수리 담당자',
    notes           VARCHAR(500),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    updated_by      VARCHAR(50),
    is_deleted      TINYINT(1) DEFAULT 0,
    FOREIGN KEY fk_fail_equip (equipment_id) REFERENCES TB_EQUIPMENT(id),
    INDEX idx_fail_equip  (equipment_id),
    INDEX idx_fail_date   (failure_date),
    INDEX idx_fail_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='설비고장';

-- ============================================================
-- 시스템 감사 로그 (TB_AUDIT_LOG)
-- ============================================================
CREATE TABLE IF NOT EXISTS TB_AUDIT_LOG (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT        COMMENT 'TB_USER.id',
    username     VARCHAR(50)   NOT NULL,
    action       VARCHAR(50)   NOT NULL COMMENT 'LOGIN/LOGOUT/CREATE/UPDATE/DELETE',
    target_table VARCHAR(100)  COMMENT '대상 테이블',
    target_id    BIGINT        COMMENT '대상 레코드 ID',
    detail       TEXT          COMMENT '변경 상세 (JSON)',
    ip_address   VARCHAR(45),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user   (user_id),
    INDEX idx_audit_date   (created_at),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='감사로그';
