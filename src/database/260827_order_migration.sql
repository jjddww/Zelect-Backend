USE zelect;

-- ===========================
-- orders
-- ===========================

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    order_number VARCHAR(30) NOT NULL,
    status ENUM(
        'ORDERED',
        'PREPARING',
        'SHIPPED',
        'DELIVERED',
        'CANCELED'
    ) NOT NULL DEFAULT 'ORDERED',

    items_price INT UNSIGNED NOT NULL,
    delivery_fee INT UNSIGNED NOT NULL DEFAULT 0,
    total_price INT UNSIGNED NOT NULL,

    recipient_name VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    address VARCHAR(500) NOT NULL,
    address_detail VARCHAR(255) NULL,
    delivery_request VARCHAR(255) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_orders_order_number
        UNIQUE (order_number),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT chk_orders_total_price
        CHECK (total_price = items_price + delivery_fee)
);

CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at);

CREATE INDEX idx_orders_status
ON orders(status);

-- ===========================
-- order_items
-- 주문 당시 상품 정보를 보존하기 위해 상품명, 옵션, 가격을 함께 저장한다.
-- 원본 상품/옵션이 삭제되어도 주문 내역은 유지되도록 FK는 SET NULL로 처리한다.
-- ===========================

CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    product_option_id BIGINT UNSIGNED NULL,

    product_name VARCHAR(200) NOT NULL,
    thumbnail_url VARCHAR(500) NULL,
    color VARCHAR(50) NOT NULL,
    size VARCHAR(30) NOT NULL,

    unit_price INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    subtotal INT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_order_items_product_option
        FOREIGN KEY (product_option_id) REFERENCES product_options(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT chk_order_items_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_items_subtotal
        CHECK (subtotal = unit_price * quantity)
);

CREATE INDEX idx_order_items_order
ON order_items(order_id);

CREATE INDEX idx_order_items_product
ON order_items(product_id);

-- ===========================
-- shipments
-- 현재는 주문당 한 건의 배송만 허용 (분리배송 불가)
-- 추후 변경
-- ===========================

CREATE TABLE shipments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    status ENUM(
        'READY',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED'
    ) NOT NULL DEFAULT 'READY',
    carrier VARCHAR(50) NULL,
    tracking_number VARCHAR(100) NULL,
    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_shipments_order
        UNIQUE (order_id),

    CONSTRAINT fk_shipments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_shipments_tracking
ON shipments(carrier, tracking_number);

CREATE INDEX idx_shipments_status
ON shipments(status);
