const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * Generate a certificate code: GIFT-XXXXXX (6 random uppercase alphanumeric chars)
 */
function generateCertificateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'GIFT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const { body, validationResult } = require('express-validator');

// ── POST /api/certificates — purchase a gift certificate ────────────
router.post(
  '/',
  [
    body('amount').isInt({ min: 1000, max: 1000000 }).withMessage('Сумма должна быть от 1 000 до 1 000 000 ₽'),
    body('purchaser_name').trim().notEmpty().escape().withMessage('Имя покупателя обязательно'),
    body('purchaser_email').isEmail().normalizeEmail().withMessage('Некорректный email покупателя'),
    body('purchaser_phone').trim().notEmpty().escape().withMessage('Телефон покупателя обязателен'),
    body('recipient_name').optional().trim().escape(),
    body('message').optional().trim().escape(),
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const db = getDb();
      const {
        amount,
        purchaser_name,
        purchaser_email,
        purchaser_phone,
        recipient_name,
        message,
      } = req.body;

      // Generate unique code
      let code;
      let attempts = 0;
      do {
        code = generateCertificateCode();
        const exists = db.prepare('SELECT 1 FROM certificates WHERE code = ?').get(code);
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({
          success: false,
          error: 'Не удалось сгенерировать код сертификата. Попробуйте ещё раз',
        });
      }

      // Expires in 1 year
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const expiresAtStr = expiresAt.toISOString().split('T')[0];

      const result = db.prepare(`
        INSERT INTO certificates (code, amount, purchaser_name, purchaser_email, purchaser_phone,
                                  recipient_name, message, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code, amount, purchaser_name, purchaser_email, purchaser_phone,
        recipient_name || null, message || null, expiresAtStr,
      );

      const certificate = db.prepare('SELECT * FROM certificates WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({ success: true, data: certificate, code: certificate.code });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/certificates/:code — look up a certificate ─────────────
router.get('/:code', (req, res, next) => {
  try {
    const db = getDb();
    const certificate = db
      .prepare('SELECT * FROM certificates WHERE code = ?')
      .get(req.params.code.toUpperCase());

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Сертификат не найден. Проверьте код',
      });
    }

    res.json({ success: true, data: certificate });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
