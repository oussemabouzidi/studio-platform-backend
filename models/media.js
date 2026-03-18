import pool from "../database.js";

let ensurePromise = null;

export async function ensureMediaTable() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media (
        id INT NOT NULL AUTO_INCREMENT,
        \`key\` VARCHAR(255) NOT NULL,
        url VARCHAR(2048) NOT NULL,
        provider ENUM('local','s3') NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        size INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_media_key (\`key\`),
        KEY idx_media_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  })();

  return ensurePromise;
}

export async function createMedia({ key, url, provider, mimeType, size }) {
  await ensureMediaTable();

  const [result] = await pool.query(
    `INSERT INTO media (\`key\`, url, provider, mime_type, size)
     VALUES (?, ?, ?, ?, ?)`,
    [key, url, provider, mimeType, size],
  );

  return {
    id: result.insertId,
    key,
    url,
    provider,
    mimeType,
    size,
  };
}

export async function listMedia({ page, pageSize }) {
  await ensureMediaTable();

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const offset = (safePage - 1) * safePageSize;

  const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM media`);
  const total = Number(countRow?.total || 0);

  const [rows] = await pool.query(
    `SELECT id, \`key\`, url, provider, mime_type, size, created_at
     FROM media
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [safePageSize, offset],
  );

  const items = rows.map((r) => ({
    id: r.id,
    key: r.key,
    url: r.url,
    provider: r.provider,
    mimeType: r.mime_type,
    size: r.size,
    createdAt: r.created_at,
  }));

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total,
  };
}

