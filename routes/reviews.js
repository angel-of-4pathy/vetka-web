const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

const { body, validationResult } = require('express-validator');

// ── GET /api/reviews — list approved reviews, newest first ──────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();

    const reviews = db
      .prepare('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC')
      .all();

    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reviews — submit a new review ─────────────────────────
router.post(
  '/',
  [
    body('guest_name').trim().notEmpty().escape().withMessage('Имя обязательно'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Рейтинг должен быть от 1 до 5'),
    body('text').trim().isLength({ min: 10 }).escape().withMessage('Текст отзыва должен содержать не менее 10 символов'),
    body('room_type').optional().isIn(['house', 'dome', 'treehouse', 'aframe', 'tent', 'barrel']).withMessage('Неверный тип размещения'),
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const db = getDb();
      const { guest_name, rating, text, room_type } = req.body;

    const result = db.prepare(`
      INSERT INTO reviews (guest_name, rating, text, room_type)
      VALUES (?, ?, ?, ?)
    `).run(guest_name, rating, text.trim(), room_type || null);

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
