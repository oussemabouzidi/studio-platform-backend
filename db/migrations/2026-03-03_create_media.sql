-- Media uploads metadata table
-- Compatible with MySQL 8+ / MariaDB 10.4+

CREATE TABLE IF NOT EXISTS media (
  id INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  provider ENUM('local','s3') NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_key (`key`),
  KEY idx_media_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

