USE zelect;

DROP TABLE IF EXISTS product_descriptions;
DROP TABLE IF EXISTS product_options;
DROP TABLE IF EXISTS product_images;

CREATE TABLE product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_product_images_sort_order CHECK (sort_order > 0),
    CONSTRAINT uq_product_images_sort_order UNIQUE (product_id, sort_order)
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

CREATE TABLE product_options (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    color VARCHAR(50) NOT NULL,
    size VARCHAR(30) NOT NULL,
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    additional_price INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'SOLD_OUT', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_options_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_product_options_combination UNIQUE (product_id, color, size)
);

CREATE INDEX idx_product_options_product ON product_options(product_id);

CREATE TABLE product_descriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_descriptions_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_product_descriptions_sort_order CHECK (sort_order > 0),
    CONSTRAINT uq_product_descriptions_sort_order UNIQUE (product_id, sort_order)
);

CREATE INDEX idx_product_descriptions_product ON product_descriptions(product_id);
