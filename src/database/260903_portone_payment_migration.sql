USE zelect;

-- 기존 주문에 결제 대기 상태를 추가
ALTER TABLE orders
    MODIFY COLUMN status ENUM(
        'PENDING_PAYMENT',
        'ORDERED',
        'PREPARING',
        'SHIPPED',
        'DELIVERED',
        'CANCELED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT';

-- 결제 완료 후 주문 생성 당시의 장바구니 항목만 삭제하기 위해 원본 ID를 보존
-- 기존 주문 데이터에는 NULL이 유지됨
SET @source_cart_item_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_items'
      AND COLUMN_NAME = 'source_cart_item_id'
);
SET @add_source_cart_item_column_sql = IF(
    @source_cart_item_column_exists = 0,
    'ALTER TABLE order_items ADD COLUMN source_cart_item_id BIGINT UNSIGNED NULL AFTER order_id',
    'SET @migration_noop = 1'
);
PREPARE add_source_cart_item_column_statement FROM @add_source_cart_item_column_sql;
EXECUTE add_source_cart_item_column_statement;
DEALLOCATE PREPARE add_source_cart_item_column_statement;

SET @source_cart_item_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_items'
      AND INDEX_NAME = 'idx_order_items_source_cart_item'
);
SET @add_source_cart_item_index_sql = IF(
    @source_cart_item_index_exists = 0,
    'CREATE INDEX idx_order_items_source_cart_item ON order_items(source_cart_item_id)',
    'SET @migration_noop = 1'
);
PREPARE add_source_cart_item_index_statement FROM @add_source_cart_item_index_sql;
EXECUTE add_source_cart_item_index_statement;
DEALLOCATE PREPARE add_source_cart_item_index_statement;

-- 포트원 결제와 내부 주문의 연결 및 멱등 처리를 위한 테이블
-- API Secret과 Webhook Secret은 DB에 저장하지 않고 서버 환경변수로만 관리
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    payment_id VARCHAR(100) NOT NULL,
    status ENUM(
        'PENDING_PAYMENT',
        'PAID',
        'PARTIALLY_CANCELED',
        'FAILED',
        'CANCELED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT',
    amount INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'KRW',
    transaction_id VARCHAR(100) NULL,
    paid_at DATETIME NULL,
    canceled_amount INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_payments_order UNIQUE (order_id),
    CONSTRAINT uq_payments_payment_id UNIQUE (payment_id),

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- payments가 이전 버전 마이그레이션으로 이미 생성된 경우에도 신규 상태와 컬럼을 반영한다.
ALTER TABLE payments
    MODIFY COLUMN status ENUM(
        'PENDING_PAYMENT',
        'PAID',
        'PARTIALLY_CANCELED',
        'FAILED',
        'CANCELED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT';

SET @canceled_amount_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'canceled_amount'
);
SET @add_canceled_amount_column_sql = IF(
    @canceled_amount_column_exists = 0,
    'ALTER TABLE payments ADD COLUMN canceled_amount INT UNSIGNED NOT NULL DEFAULT 0 AFTER paid_at',
    'SET @migration_noop = 1'
);
PREPARE add_canceled_amount_column_statement FROM @add_canceled_amount_column_sql;
EXECUTE add_canceled_amount_column_statement;
DEALLOCATE PREPARE add_canceled_amount_column_statement;

SET @payments_status_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND INDEX_NAME = 'idx_payments_status'
);
SET @add_payments_status_index_sql = IF(
    @payments_status_index_exists = 0,
    'CREATE INDEX idx_payments_status ON payments(status)',
    'SET @migration_noop = 1'
);
PREPARE add_payments_status_index_statement FROM @add_payments_status_index_sql;
EXECUTE add_payments_status_index_statement;
DEALLOCATE PREPARE add_payments_status_index_statement;

-- 주문 생성 시 재고를 먼저 확보하고 결제 승인 또는 만료까지 상태를 추적한다.
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NOT NULL,
    product_option_id BIGINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    status ENUM('RESERVED', 'CONFIRMING', 'CONFIRMED', 'RELEASED')
        NOT NULL DEFAULT 'RESERVED',
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_inventory_reservations_order_item UNIQUE (order_item_id),
    CONSTRAINT fk_inventory_reservations_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_reservations_order_item
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_reservations_product_option
        FOREIGN KEY (product_option_id) REFERENCES product_options(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_inventory_reservations_quantity CHECK (quantity > 0),
    INDEX idx_inventory_reservations_expiry (status, expires_at),
    INDEX idx_inventory_reservations_order (order_id, status)
);

-- 상품 단위 부분 취소 요청과 재고 복구의 멱등성을 보장한다.
CREATE TABLE IF NOT EXISTS payment_cancellations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    portone_cancellation_id VARCHAR(100) NULL,
    status ENUM('REQUESTED', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
    amount INT UNSIGNED NOT NULL,
    reason VARCHAR(255) NOT NULL,
    stock_restored BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_payment_cancellations_request UNIQUE (payment_id, request_id),
    CONSTRAINT uq_payment_cancellations_portone UNIQUE (portone_cancellation_id),
    CONSTRAINT fk_payment_cancellations_payment
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_cancellation_items (
    cancellation_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    amount INT UNSIGNED NOT NULL,

    PRIMARY KEY (cancellation_id, order_item_id),
    CONSTRAINT fk_payment_cancellation_items_cancellation
        FOREIGN KEY (cancellation_id) REFERENCES payment_cancellations(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_payment_cancellation_items_order_item
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_payment_cancellation_items_quantity CHECK (quantity > 0)
);

SET @payment_cancellations_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_cancellations'
      AND INDEX_NAME = 'idx_payment_cancellations_payment'
);
SET @add_payment_cancellations_index_sql = IF(
    @payment_cancellations_index_exists = 0,
    'CREATE INDEX idx_payment_cancellations_payment ON payment_cancellations(payment_id, status)',
    'SET @migration_noop = 1'
);
PREPARE add_payment_cancellations_index_statement FROM @add_payment_cancellations_index_sql;
EXECUTE add_payment_cancellations_index_statement;
DEALLOCATE PREPARE add_payment_cancellations_index_statement;
