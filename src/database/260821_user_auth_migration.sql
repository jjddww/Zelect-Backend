ALTER TABLE users
    ADD COLUMN login_id VARCHAR(30) NULL AFTER id,
    CHANGE COLUMN nickname name VARCHAR(50) NOT NULL,
    ADD COLUMN address VARCHAR(500) NULL AFTER phone,
    ADD COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')
        NOT NULL DEFAULT 'ACTIVE' AFTER mileage;

-- 기존 회원은 임시 아이디와 빈 주소로 백필한다. 실제 서비스에서는 회원에게 수정을 요청한다.
UPDATE users
SET login_id = CONCAT('user_', id),
    phone = COALESCE(phone, ''),
    address = ''
WHERE login_id IS NULL;

ALTER TABLE users
    MODIFY COLUMN login_id VARCHAR(30) NOT NULL,
    MODIFY COLUMN phone VARCHAR(20) NOT NULL,
    MODIFY COLUMN address VARCHAR(500) NOT NULL,
    ADD CONSTRAINT uq_users_login_id UNIQUE (login_id);

CREATE INDEX idx_users_status ON users(status);
