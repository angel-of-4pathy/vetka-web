/**
 * КЕДР Glamping — Production Server
 * Node.js + Express + SQLite
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db/database');

const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const certificatesRouter = require('./routes/certificates');
const reviewsRouter = require('./routes/reviews');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const { authenticateAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';



// Enable trust proxy for Docker / Nginx / Cloudflare reverse proxies
app.set('trust proxy', 1);

// ── Security Headers ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://yandex.ru"],
      frameSrc: ["'self'", "https://yandex.ru"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Compression ─────────────────────────────────────────────────────
app.use(compression());

// ── CORS ────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Request Logging (with Rotation) ─────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

if (isProd) {
  const rfs = require('rotating-file-stream');
  const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: logsDir,
    compress: 'gzip' // compress rotated files
  });
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// ── Database Backups Cron ───────────────────────────────────────────
const cron = require('node-cron');
const { createBackup } = require('./db/backup');

// Run backup every night at 03:00 AM
cron.schedule('0 3 * * *', () => {
  console.log('[КЕДР] Запуск автоматического резервного копирования...');
  createBackup();
});

// ── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate Limiting ───────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS) || 60000;
const RATE_MAX = parseInt(process.env.RATE_MAX) || 100;

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_WINDOW_MS * 2) rateLimitMap.delete(ip);
  }
}, 300000);

app.use('/api', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
  } else {
    const entry = rateLimitMap.get(ip);
    if (now - entry.start > RATE_WINDOW_MS) {
      rateLimitMap.set(ip, { count: 1, start: now });
    } else {
      entry.count++;
      if (entry.count > RATE_MAX) {
        return res.status(429).json({
          success: false,
          error: 'Слишком много запросов. Попробуйте через минуту',
        });
      }
    }
  }
  next();
});

// ── Static Files (with cache) ───────────────────────────────────────
app.use('/Vetka_files', express.static(path.join(__dirname, 'Samples', 'Site', 'Vetka_files')));
app.use('/glamp_files', express.static(path.join(__dirname, 'Samples', 'VK', 'glamp_files')));
app.use('/photos_vk_files', express.static(path.join(__dirname, 'Samples', 'VK', 'photos_vk_files')));
app.use('/uslugi_files', express.static(path.join(__dirname, 'Samples', 'VK', 'uslugi-22436848_files')));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '7d' : 0,
  etag: true,
  lastModified: true,
}));

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', authenticateAdmin, adminRouter);

// ── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    },
  });
});

// ── robots.txt ──────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/admin/\nSitemap: ' +
    (process.env.SITE_URL || `http://localhost:${PORT}`) + '/sitemap.xml'
  );
});

// ── sitemap.xml ─────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_URL || `http://localhost:${PORT}`;
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/#about', priority: '0.8', changefreq: 'monthly' },
    { loc: '/#rooms', priority: '0.9', changefreq: 'weekly' },
    { loc: '/#booking', priority: '0.9', changefreq: 'weekly' },
    { loc: '/#activities', priority: '0.7', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${base}${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

// ── SPA Catch-all & Admin Redirect ─────────────────────────────────
app.get('/admin', (req, res) => res.redirect('/admin.html'));

app.get('*', (req, res) => {
  // Don't catch API or file requests
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return res.status(404).json({ success: false, error: 'Не найдено' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = isProd ? 'Внутренняя ошибка сервера' : (err.message || 'Неизвестная ошибка');

  console.error(`[${new Date().toISOString()}] ERROR ${status}:`, err.stack || err.message || err);

  // Log to file in production
  if (isProd) {
    const errorLog = `[${new Date().toISOString()}] ${req.method} ${req.path} ${status}: ${err.stack || err.message}\n`;
    fs.appendFileSync(path.join(logsDir, 'error.log'), errorLog);
  }

  res.status(status).json({ success: false, error: message });
});

// ── Database Init ───────────────────────────────────────────────────
try {
  initDatabase();
  console.log(`[КЕДР] База данных инициализирована`);
} catch (err) {
  console.error('[КЕДР] Ошибка инициализации БД:', err);
  process.exit(1);
}

// ── Start Server ────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[КЕДР] Сервер запущен | Порт: ${PORT} | Режим: ${NODE_ENV}`);
  console.log(`[КЕДР] Сайт:   http://localhost:${PORT}`);
  console.log(`[КЕДР] Админка: http://localhost:${PORT}/admin.html`);
  console.log(`[КЕДР] Health:  http://localhost:${PORT}/api/health`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[КЕДР] Получен ${signal}. Завершение...`);
  server.close(() => {
    console.log('[КЕДР] HTTP сервер закрыт');
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => {
    console.error('[КЕДР] Принудительное завершение');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[КЕДР] Необработанная ошибка:', err);
  if (isProd) {
    fs.appendFileSync(path.join(logsDir, 'error.log'),
      `[${new Date().toISOString()}] UNCAUGHT: ${err.stack}\n`);
  }
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[КЕДР] Необработанный Promise:', reason);
});

module.exports = app;
