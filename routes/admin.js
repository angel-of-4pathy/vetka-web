const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/admin/stats — dashboard statistics ─────────────────────
router.get('/stats', (req, res, next) => {
  try {
    const db = getDb();

    const totalBookings = db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count;
    const pendingBookings = db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'pending'").get().count;
    const confirmedBookings = db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'confirmed'").get().count;
    const cancelledBookings = db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'cancelled'").get().count;

    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) AS total FROM bookings WHERE status != 'cancelled'").get().total;

    const totalCertificates = db.prepare('SELECT COUNT(*) AS count FROM certificates').get().count;
    const certRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM certificates').get().total;

    const totalReviews = db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
    const avgRating = db.prepare('SELECT ROUND(AVG(rating), 1) AS avg FROM reviews WHERE is_approved = 1').get().avg || 0;

    // Популярные номера (по количеству бронирований)
    const popularRooms = db.prepare(`
      SELECT r.name, r.type, COUNT(b.id) AS bookings_count,
             COALESCE(SUM(b.total_price), 0) AS total_revenue
      FROM rooms r
      LEFT JOIN bookings b ON b.room_id = r.id AND b.status != 'cancelled'
      GROUP BY r.id
      ORDER BY bookings_count DESC
    `).all();

    // Последние бронирования
    const recentBookings = db.prepare(`
      SELECT b.*, r.name AS room_name
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      ORDER BY b.created_at DESC
      LIMIT 20
    `).all();

    res.json({
      success: true,
      data: {
        bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings, cancelled: cancelledBookings },
        revenue: { bookings: totalRevenue, certificates: certRevenue, total: totalRevenue + certRevenue },
        certificates: { total: totalCertificates },
        reviews: { total: totalReviews, avg_rating: avgRating },
        popular_rooms: popularRooms,
        recent_bookings: recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
});

function sanitizeCsvField(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+@\-\t\r]/.test(str)) {
    str = "'" + str;
  }
  return '"' + str.replace(/"/g, '""') + '"';
}

// ── GET /api/admin/bookings/export — export to CSV ──────────────────
router.get('/bookings/export', (req, res, next) => {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT b.id, b.booking_code, r.name AS room, b.guest_name, b.guest_email, b.guest_phone,
             b.check_in, b.check_out, b.guests_count, b.total_price, b.status, b.created_at
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      ORDER BY b.created_at DESC
    `).all();

    const headers = ['ID', 'Code', 'Room', 'Guest Name', 'Email', 'Phone', 'Check-in', 'Check-out', 'Guests', 'Price', 'Status', 'Created At'];
    
    // Format rows safely
    const rows = bookings.map(b => [
      sanitizeCsvField(b.id),
      sanitizeCsvField(b.booking_code),
      sanitizeCsvField(b.room),
      sanitizeCsvField(b.guest_name),
      sanitizeCsvField(b.guest_email),
      sanitizeCsvField(b.guest_phone),
      sanitizeCsvField(b.check_in),
      sanitizeCsvField(b.check_out),
      sanitizeCsvField(b.guests_count),
      sanitizeCsvField(b.total_price),
      sanitizeCsvField(b.status),
      sanitizeCsvField(b.created_at)
    ].join(','));

    const csvContent = [headers.map(sanitizeCsvField).join(','), ...rows].join('\n');

    // Make sure Russian characters are displayed correctly in Excel using BOM
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vetka_bookings.csv"');
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/bookings — all bookings with filters ─────────────
router.get('/bookings', (req, res, next) => {
  try {
    const db = getDb();
    const { status, room_id, from_date, to_date } = req.query;

    let sql = `
      SELECT b.*, r.name AS room_name, r.type AS room_type
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { sql += ' AND b.status = ?'; params.push(status); }
    if (room_id) { sql += ' AND b.room_id = ?'; params.push(parseInt(room_id)); }
    if (from_date) { sql += ' AND b.check_in >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND b.check_out <= ?'; params.push(to_date); }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = db.prepare(sql).all(...params);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/bookings/:id/confirm — confirm booking ─────────
router.patch('/bookings/:id/confirm', (req, res, next) => {
  try {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
    }
    if (booking.status === 'confirmed') {
      return res.status(400).json({ success: false, error: 'Уже подтверждено' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Нельзя подтвердить отменённое бронирование' });
    }

    db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = ?').get(req.params.id);

    res.json({ success: true, data: updated, message: 'Бронирование подтверждено' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/bookings/:id/cancel — admin cancel ─────────────
router.patch('/bookings/:id/cancel', (req, res, next) => {
  try {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Уже отменено' });
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    res.json({ success: true, data: updated, message: 'Бронирование отменено' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/bookings/:id — delete booking ─────────────────
router.delete('/bookings/:id', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
    }

    res.json({ success: true, message: 'Бронирование удалено' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/certificates — all certificates ──────────────────
router.get('/certificates', (req, res, next) => {
  try {
    const db = getDb();
    const certs = db.prepare('SELECT * FROM certificates ORDER BY created_at DESC').all();
    res.json({ success: true, data: certs });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/reviews/:id/approve ─────────────────────────────
router.patch('/reviews/:id/approve', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('UPDATE reviews SET is_approved = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Отзыв одобрен' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/reviews/:id/reject ──────────────────────────────
router.patch('/reviews/:id/reject', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('UPDATE reviews SET is_approved = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Отзыв отклонён' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/reviews/:id — delete review ────────────────────
router.delete('/reviews/:id', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Отзыв не найден' });
    }
    res.json({ success: true, message: 'Отзыв удалён' });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/rooms/:id — update room ───────────────────────────
router.put('/rooms/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { name, description, short_description, price_weekday, price_weekend, max_guests, amenities, area, is_active } = req.body;

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Номер не найден' });
    }

    db.prepare(`
      UPDATE rooms SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        price_weekday = COALESCE(?, price_weekday),
        price_weekend = COALESCE(?, price_weekend),
        max_guests = COALESCE(?, max_guests),
        amenities = COALESCE(?, amenities),
        area = COALESCE(?, area),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name || null, description || null, short_description || null,
      price_weekday || null, price_weekend || null, max_guests || null,
      amenities ? JSON.stringify(amenities) : null, area || null,
      is_active !== undefined ? is_active : null, req.params.id
    );

    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
