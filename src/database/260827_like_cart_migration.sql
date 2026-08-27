USE zelect;

-- ===========================
-- product_likes
-- ===========================

CREATE TABLE product_likes (
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, product_id),

    CONSTRAINT fk_product_likes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_product_likes_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_product_likes_product
ON product_likes(product_id);

CREATE INDEX idx_product_likes_user_created
ON product_likes(user_id, created_at);

-- ===========================
-- cart_items
-- ===========================

CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_option_id BIGINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_items_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_cart_items_product_option
        FOREIGN KEY (product_option_id) REFERENCES product_options(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_cart_items_quantity
        CHECK (quantity > 0),

    CONSTRAINT uq_cart_items_user_option
        UNIQUE (user_id, product_option_id)
);

CREATE INDEX idx_cart_items_product_option
ON cart_items(product_option_id);

CREATE INDEX idx_cart_items_user_updated
ON cart_items(user_id, updated_at);
