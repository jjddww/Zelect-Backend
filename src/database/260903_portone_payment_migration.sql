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
ALTER TABLE order_items
    ADD COLUMN source_cart_item_id BIGINT UNSIGNED NULL AFTER order_id;

CREATE INDEX idx_order_items_source_cart_item
    ON order_items(source_cart_item_id);

-- 포트원 결제와 내부 주문의 연결 및 멱등 처리를 위한 테이블
-- API Secret과 Webhook Secret은 DB에 저장하지 않고 서버 환경변수로만 관리
CREATE TABLE payments (
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

CREATE INDEX idx_payments_status
    ON payments(status);

-- 상품 단위 부분 취소 요청과 재고 복구의 멱등성을 보장한다.
CREATE TABLE payment_cancellations (
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

CREATE TABLE payment_cancellation_items (
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

CREATE INDEX idx_payment_cancellations_payment
    ON payment_cancellations(payment_id, status);
