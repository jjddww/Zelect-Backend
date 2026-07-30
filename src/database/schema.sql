DROP DATABASE IF EXISTS zelect;

CREATE DATABASE zelect
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE zelect;

-- ===========================
-- users
-- ===========================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    nickname VARCHAR(50) NOT NULL,

    phone VARCHAR(20),

    grade ENUM(
        'GENERAL',
        'VIP',
        'VVIP'
    ) NOT NULL DEFAULT 'GENERAL',

    mileage INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================
-- brands
-- ===========================

CREATE TABLE brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    logo_url VARCHAR(500),

    description TEXT,

    follower_count INT NOT NULL DEFAULT 0
);

-- ===========================
-- categories
-- ===========================

CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    parent_id BIGINT UNSIGNED NULL,

    name VARCHAR(50) NOT NULL,

    depth TINYINT NOT NULL,

    sort_order INT NOT NULL,

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    UNIQUE (parent_id, name)
);

-- ===========================
-- products
-- ===========================

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    brand_id BIGINT UNSIGNED NOT NULL,

    category_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(200) NOT NULL,

    price INT NOT NULL,

    discount_rate TINYINT UNSIGNED NOT NULL DEFAULT 0,

    thumbnail_url VARCHAR(500) NULL,

    description JSON NULL,

    status ENUM(
        'ACTIVE',
        'SOLD_OUT',
        'HIDDEN'
    ) NOT NULL DEFAULT 'ACTIVE',

    like_count INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id)
        REFERENCES brands(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ===========================
-- exhibitions
-- ===========================

CREATE TABLE exhibitions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(200) NOT NULL,

    banner_image_url VARCHAR(500),

    start_at DATETIME NOT NULL,

    end_at DATETIME NOT NULL,

    linked_product_ids JSON NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Indexes
-- ===========================

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_brands_name
ON brands(name);

CREATE INDEX idx_categories_parent
ON categories(parent_id);

CREATE INDEX idx_products_brand
ON products(brand_id);

CREATE INDEX idx_products_category
ON products(category_id);

CREATE INDEX idx_products_status
ON products(status);

CREATE INDEX idx_products_name
ON products(name);

CREATE INDEX idx_exhibitions_period
ON exhibitions(start_at, end_at);