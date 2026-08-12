USE zelect;

-- 이 파일을 다시 실행해도 중복 오류가 발생하지 않도록
-- featured_brands 테이블만 초기화한다.
DROP TABLE IF EXISTS featured_brands;

-- ===========================
-- featured_brands
-- 이 주의 브랜드 노출 정보
-- ===========================

CREATE TABLE featured_brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    brand_id BIGINT UNSIGNED NOT NULL,

    headline VARCHAR(150) NULL,

    subheadline VARCHAR(300) NULL,

    start_at DATETIME NOT NULL,

    end_at DATETIME NOT NULL,

    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_featured_brands_brand
        FOREIGN KEY (brand_id)
        REFERENCES brands(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_featured_brands_period
        CHECK (start_at < end_at),

    CONSTRAINT chk_featured_brands_sort_order
        CHECK (sort_order > 0),

    CONSTRAINT uq_featured_brands_period
        UNIQUE (brand_id, start_at, end_at)
);

CREATE INDEX idx_featured_brands_period
ON featured_brands(start_at, end_at, sort_order);

-- ===========================
-- featured_brands seed
-- brands 시드가 먼저 입력되어 있어야 한다.
-- ===========================

INSERT INTO featured_brands (
    brand_id,
    headline,
    subheadline,
    start_at,
    end_at,
    sort_order
)
VALUES (
    1,
    '이번 주, LUNARO를 만나보세요',
    '절제된 실루엣과 프리미엄 소재로 완성한 이번 주의 브랜드',
    '2026-08-10 00:00:00',
    '2026-08-17 00:00:00',
    1
);
