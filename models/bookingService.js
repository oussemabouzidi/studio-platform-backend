import pool from "../database.js";

let ensured = false;

export async function ensureBookingServiceTable() {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_service (
      booking_id INT NOT NULL,
      studio_id INT NOT NULL,
      service_id INT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (booking_id),
      KEY idx_booking_service_service_id (service_id),
      KEY idx_booking_service_studio_id (studio_id),
      CONSTRAINT fk_booking_service_booking FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
      CONSTRAINT fk_booking_service_studio FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
      CONSTRAINT fk_booking_service_service FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  ensured = true;
}

export async function attachBookingService({ bookingId, studioId, serviceId, status }) {
  await ensureBookingServiceTable();

  await pool.query(
    `
      INSERT INTO booking_service (booking_id, studio_id, service_id, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        studio_id = VALUES(studio_id),
        service_id = VALUES(service_id),
        status = VALUES(status)
    `,
    [bookingId, studioId, serviceId, status || "Pending"],
  );
}

