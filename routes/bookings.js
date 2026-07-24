const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

/**
 * Generate a booking code: KDR-XXXXXX (6 random uppercase alphanumeric chars)
 */
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'KDR-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Calculate total price for a date range, using weekday/weekend rates.
 */
function calculateTotalPrice(checkIn, checkOut, priceWeekday, priceWeekend) {
  let total = 0;
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);

  const cursor = new Date(Date.UTC(inY, inM - 1, inD));
  const end = new Date(Date.UTC(outY, outM - 1, outD));

  while (cursor < end) {
    const day = cursor.getUTCDay();
    const isWeekend = day === 0 || day === 5 || day === 6;
    total += isWeekend ? priceWeekend : priceWeekday;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return total;
}

const { body, validationResult } = require('express-validator');

// ── POST /api/bookings — create a new booking ───────────────────────
router.post(
  '/',
  [
    body('room_id').isInt({ gt: 0 }).withMessage('Некорректный ID номера'),
    body('guest_name').trim().notEmpty().escape().withMessage('Имя обязательно'),
    body('guest_email').isEmail().normalizeEmail().withMessage('Некорректный email'),
    body('guest_phone').trim().notEmpty().escape().withMessage('Телефон обязателен'),
    body('check_in').isISO8601().withMessage('Некорректная дата заезда'),
    body('check_out').isISO8601().withMessage('Некорректная дата выезда'),
    body('guests_count').isInt({ gt: 0, lt: 10 }).withMessage('Некорректное количество гостей'),
    body('comment').optional().trim().escape(),
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const db = getDb();
      const {
        room_id,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        guests_count,
        comment,
      } = req.body;

      // Validate room exists
      const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND is_active = 1').get(room_id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Номер не найден' });
      }

      // Validate dates
      const [inY, inM, inD] = check_in.split('-').map(Number);
      const [outY, outM, outD] = check_out.split('-').map(Number);
      const ciDate = new Date(Date.UTC(inY, inM - 1, inD));
      const coDate = new Date(Date.UTC(outY, outM - 1, outD));

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

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (ciDate < today) {
        return res.status(400).json({
          success: false,
          error: 'Дата заезда не может быть в прошлом',
        });
      }

      // Validate guests count
      if (guests_count < 1 || guests_count > room.max_guests) {
        return res.status(400).json({
          success: false,
          error: `Количество гостей должно быть от 1 до ${room.max_guests}`,
        });
      }

      const certificate_code = req.body.certificate_code ? req.body.certificate_code.trim().toUpperCase() : null;

      // Execute transaction to lock atomic checks and insertion
      let bookingId;
      let finalPrice;
      let generatedCode;

      try {
        const createBookingTx = db.transaction(() => {
          // Check date availability inside transaction
          const overlapping = db
            .prepare(`
              SELECT COUNT(*) AS cnt FROM bookings
              WHERE room_id = ?
                AND status != 'cancelled'
                AND check_in < ?
                AND check_out > ?
            `)
            .get(room_id, check_out, check_in);

          if (overlapping.cnt > 0) {
            const err = new Error('Выбранные даты уже заняты. Пожалуйста, выберите другие даты');
            err.status = 409;
            throw err;
          }

          // Calculate price
          let total_price = calculateTotalPrice(check_in, check_out, room.price_weekday, room.price_weekend);

          // Certificate logic inside transaction
          let certificate = null;
          if (certificate_code) {
            certificate = db.prepare('SELECT * FROM certificates WHERE code = ? AND is_used = 0').get(certificate_code);
            if (!certificate) {
              const err = new Error('Сертификат недействителен, уже использован или не существует');
              err.status = 400;
              throw err;
            }

            if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
              const err = new Error('Срок действия сертификата истек');
              err.status = 400;
              throw err;
            }

            total_price = Math.max(0, total_price - certificate.amount);
          }

          // Generate unique booking code
          let booking_code;
          let attempts = 0;
          do {
            booking_code = generateBookingCode();
            const exists = db.prepare('SELECT 1 FROM bookings WHERE booking_code = ?').get(booking_code);
            if (!exists) break;
            attempts++;
          } while (attempts < 10);

          if (attempts >= 10) {
            const err = new Error('Не удалось сгенерировать код бронирования. Попробуйте ещё раз');
            err.status = 500;
            throw err;
          }

          const result = db.prepare(`
            INSERT INTO bookings (booking_code, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests_count, total_price, comment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(booking_code, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests_count, total_price, comment || null);

          if (certificate) {
            db.prepare('UPDATE certificates SET is_used = 1 WHERE id = ?').run(certificate.id);
          }

          generatedCode = booking_code;
          finalPrice = total_price;
          return result.lastInsertRowid;
        });

        bookingId = createBookingTx();
      } catch (txErr) {
        if (txErr.status) {
          return res.status(txErr.status).json({ success: false, error: txErr.message });
        }
        throw txErr;
      }

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

      res.status(201).json({
        success: true,
        data: {
          ...booking,
          room_name: room.name,
        },
      });

  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/:code — find booking by code ──────────────────
router.get('/:code', (req, res, next) => {
  try {
    const db = getDb();
    const booking = db
      .prepare(`
        SELECT b.*, r.name AS room_name, r.type AS room_type, r.image_url AS room_image
        FROM bookings b
        JOIN rooms r ON r.id = b.room_id
        WHERE b.booking_code = ?
      `)
      .get(req.params.code.toUpperCase());

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено. Проверьте код бронирования',
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/bookings/:code/cancel — cancel a booking ─────────────
router.patch('/:code/cancel', (req, res, next) => {
  try {
    const db = getDb();
    const code = req.params.code.toUpperCase();

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(code);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Бронирование не найдено. Проверьте код бронирования',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Это бронирование уже отменено',
      });
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE booking_code = ?").run(code);

    const updated = db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(code);

    res.json({
      success: true,
      data: updated,
      message: 'Бронирование успешно отменено',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
