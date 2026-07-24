const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/rooms — list rooms, optional ?type= filter ──────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { type } = req.query;

    let rows;
    if (type) {
      rows = db
        .prepare('SELECT * FROM rooms WHERE is_active = 1 AND type = ? ORDER BY id')
        .all(type);
    } else {
      rows = db
        .prepare('SELECT * FROM rooms WHERE is_active = 1 ORDER BY id')
        .all();
    }

    // Parse JSON fields
    const rooms = rows.map((r) => ({
      ...r,
      amenities: JSON.parse(r.amenities || '[]'),
      gallery: JSON.parse(r.gallery || '[]'),
    }));

    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rooms/:id — single room ────────────────────────────────
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const room = db
      .prepare('SELECT * FROM rooms WHERE id = ? AND is_active = 1')
      .get(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Номер не найден' });
    }

    room.amenities = JSON.parse(room.amenities || '[]');
    room.gallery = JSON.parse(room.gallery || '[]');

    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rooms/:id/availability ─────────────────────────────────
// Query: check_in, check_out (YYYY-MM-DD)
router.get('/:id/availability', (req, res, next) => {
  try {
    const db = getDb();
    const { check_in, check_out } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error: 'Укажите даты заезда (check_in) и выезда (check_out)',
      });
    }

    const room = db
      .prepare('SELECT * FROM rooms WHERE id = ? AND is_active = 1')
      .get(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Номер не найден' });
    }

    // Validate date order
    const ciDate = new Date(check_in);
    const coDate = new Date(check_out);

    if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный формат даты. Используйте YYYY-MM-DD',
      });
    }

    if (coDate <= ciDate) {
      return res.status(400).json({
        success: false,
        error: 'Дата выезда должна быть позже даты заезда',
      });
    }

    // Check for overlapping confirmed/pending bookings
    const overlapping = db
      .prepare(`
        SELECT COUNT(*) AS cnt FROM bookings
        WHERE room_id = ?
          AND status != 'cancelled'
          AND check_in < ?
          AND check_out > ?
      `)
      .get(room.id, check_out, check_in);

    const available = overlapping.cnt === 0;

    // Calculate total price based on weekday / weekend rates
    let totalPrice = 0;
    const dates = [];
    const cursor = new Date(ciDate);

    while (cursor < coDate) {
      const day = cursor.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
      const price = isWeekend ? room.price_weekend : room.price_weekday;
      dates.push({
        date: cursor.toISOString().split('T')[0],
        price,
        is_weekend: isWeekend,
      });
      totalPrice += price;
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        available,
        room_id: room.id,
        check_in,
        check_out,
        nights: dates.length,
        dates,
        price_total: totalPrice,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
