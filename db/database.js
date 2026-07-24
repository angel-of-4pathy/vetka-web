const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vetka.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const database = getDb();

  // ── Create tables ─────────────────────────────────────────────────────

  database.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('house', 'dome', 'treehouse', 'aframe', 'tent', 'barrel')),
      description TEXT,
      short_description TEXT,
      price_weekday INTEGER NOT NULL,
      price_weekend INTEGER NOT NULL,
      max_guests  INTEGER NOT NULL,
      amenities   TEXT,
      image_url   TEXT,
      gallery     TEXT,
      area        INTEGER,
      is_active   INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code  TEXT UNIQUE NOT NULL,
      room_id       INTEGER NOT NULL REFERENCES rooms(id),
      guest_name    TEXT NOT NULL,
      guest_email   TEXT NOT NULL,
      guest_phone   TEXT NOT NULL,
      check_in      TEXT NOT NULL,
      check_out     TEXT NOT NULL,
      guests_count  INTEGER NOT NULL,
      total_price   INTEGER NOT NULL,
      status        TEXT DEFAULT 'pending',
      comment       TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      code            TEXT UNIQUE NOT NULL,
      amount          INTEGER NOT NULL,
      purchaser_name  TEXT NOT NULL,
      purchaser_email TEXT NOT NULL,
      purchaser_phone TEXT NOT NULL,
      recipient_name  TEXT,
      message         TEXT,
      is_used         INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      expires_at      TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name  TEXT NOT NULL,
      rating      INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      text        TEXT NOT NULL,
      room_type   TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      is_approved INTEGER DEFAULT 0
    );
  `);

  // ── Seed rooms (ensure VETKA rooms are present) ───────────────────────

  const insertRoom = database.prepare(`
    INSERT OR REPLACE INTO rooms (id, name, type, description, short_description,
                       price_weekday, price_weekend, max_guests,
                       amenities, image_url, gallery, area)
    VALUES (@id, @name, @type, @description, @short_description,
            @price_weekday, @price_weekend, @max_guests,
            @amenities, @image_url, @gallery, @area)
  `);

  const rooms = [
    {
      id: 1,
      name: 'Глэмпинг VETKA дом Барнхаус',
      type: 'house',
      description: 'Домик находится прямо в сосновом бору, соседей нет — полная тишина и покой. В стоимость проживания включены: мангальная зона (угли, розжиг, решётка), колонка Алиса, телевизор с платными подписками, проектор с фильмами, тёплый пол по всему домику, кондиционер, настольные игры, а также кухонная зона со всей необходимой посудой, питьевой водой, чаем, сахаром и специями.',
      short_description: 'Домик в сосновом бору с панорамным видом, проектором и мангалом',
      price_weekday: 9000,
      price_weekend: 12000,
      max_guests: 4,
      amenities: JSON.stringify(['Панорамный вид на лес', 'Проектор + фильмы', 'Колонка Алиса', 'Тёплый пол', 'Кондиционер', 'Кухня со специями и чаем', 'Мангал + угли и розжиг', 'Настольные игры']),
      image_url: '/Vetka_files/XXL(10)',
      gallery: JSON.stringify(['/Vetka_files/XXL(10)', '/Vetka_files/XXL(7)', '/Vetka_files/XXL(8)']),
      area: 45,
    },
    {
      id: 2,
      name: 'Купольный шатёр VETKA «Панорама»',
      type: 'dome',
      description: 'Уютный купольный шатёр с панорамным остеклением в окружении смешанного леса Татарстана. Идеальное место для романтического уединения вдвоём. Прозрачный купол позволяет наблюдать за звёздным небом прямо с кровати. Внутри — двуспальная кровать с ортопедическим матрасом, душ и туалет, тёплый пол, кондиционер, кухонный уголок и терраса.',
      short_description: 'Романтический купол с прозрачным потолком и видом на звёзды',
      price_weekday: 7500,
      price_weekend: 10000,
      max_guests: 2,
      amenities: JSON.stringify(['Прозрачный купол', 'Ортопедический матрас', 'Душ и туалет', 'Тёплый пол', 'Кондиционер', 'Мини-кухня', 'Терраса с мебелью']),
      image_url: '/Vetka_files/XXL(9)',
      gallery: JSON.stringify(['/Vetka_files/XXL(9)', '/Vetka_files/XXL(7)', '/Vetka_files/XXL(5)']),
      area: 32,
    },
    {
      id: 3,
      name: 'А-Фрейм домик «Лесной»',
      type: 'aframe',
      description: 'Стильный двухэтажный А-фрейм домик в скандинавском стиле среди сосен. Панорамное окно во всю стену наполняет пространство светом. Двуспальная кровать на втором уровне, кухонная зона, душевая и санузел. На террасе — своя мангальная зона.',
      short_description: 'Скандинавский А-фрейм домик среди сосен с панорамными окнами',
      price_weekday: 6500,
      price_weekend: 9500,
      max_guests: 3,
      amenities: JSON.stringify(['Панорамное остекление', 'Два уровня', 'Мини-кухня', 'Душ и санузел', 'Терраса с мангалом', 'Настольные игры', 'Обогреватель']),
      image_url: '/glamp_files/cz5FUykCc5Q.jpg',
      gallery: JSON.stringify(['/glamp_files/cz5FUykCc5Q.jpg', '/Vetka_files/XXL(7)', '/Vetka_files/XXL(8)']),
      area: 30,
    },
    {
      id: 4,
      name: 'Кедровая баня-бочка',
      type: 'barrel',
      description: 'Настоящая русская баня в кедровой бочке с панорамным видом на сосновый бор. Комната отдыха с зоной чаепития, купель с холодной водой, запаренные веники. Бронируется от 2 часов. Вместимость до 6 человек.',
      short_description: 'Кедровая баня-бочка с панорамной парилкой и банным сетом',
      price_weekday: 2000,
      price_weekend: 3000,
      max_guests: 6,
      amenities: JSON.stringify(['Кедровая парилка', 'Панорамный вид', 'Комната отдыха', 'Банные веники', 'Чайный сет', 'Полотенца']),
      image_url: '/Vetka_files/XXL(1)',
      gallery: JSON.stringify(['/Vetka_files/XXL(1)', '/Vetka_files/XXL(7)']),
      area: 20,
    },
    {
      id: 5,
      name: 'Аренда Сибирского Чана',
      type: 'barrel',
      description: 'Горячий чан под открытым небом прямо среди деревьев. Заваривается со свежими пихтовыми ветками и дольками цитрусов. Настоящее наслаждение на свежем воздухе.',
      short_description: 'Горячий чан под открытым небом с пихтовыми ветками и цитрусами',
      price_weekday: 4000,
      price_weekend: 5000,
      max_guests: 6,
      amenities: JSON.stringify(['Горячий чан на дровах', 'Пихтовые ветки', 'Цитрусовый аромат', 'Зона отдыха у костра']),
      image_url: '/Vetka_files/XXL(7)',
      gallery: JSON.stringify(['/Vetka_files/XXL(7)', '/Vetka_files/XXL(1)']),
      area: 15,
    },
    {
      id: 6,
      name: 'Детская игровая зона',
      type: 'tent',
      description: 'Большой детский игровой комплекс с горками, качелями и морем игрушек на безопасной огороженной территории глэмпинга.',
      short_description: 'Игровой городок с качелями и горками для маленьких гостей',
      price_weekday: 1000,
      price_weekend: 1500,
      max_guests: 4,
      amenities: JSON.stringify(['Детский городок', 'Качели и горка', 'Игрушки', 'Безопасная территория']),
      image_url: '/Vetka_files/XXL',
      gallery: JSON.stringify(['/Vetka_files/XXL']),
      area: 25,
    },
  ];

  const insertMany = database.transaction((items) => {
    for (const item of items) insertRoom.run(item);
  });
  insertMany(rooms);

  // ── Seed reviews ──────────────────────────────────────────────────────

  const insertReview = database.prepare(`
    INSERT OR REPLACE INTO reviews (id, guest_name, rating, text, room_type, is_approved)
    VALUES (@id, @guest_name, @rating, @text, @room_type, 1)
  `);

  const reviews = [
    {
      id: 1,
      guest_name: 'Роман',
      rating: 5,
      text: 'Место супер, отдохнули на 200%, всем рекомендую👍👍👍',
      room_type: 'aframe',
    },
    {
      id: 2,
      guest_name: 'Ольга Х.',
      rating: 5,
      text: 'Место просто волшебное! У компании большая территория. Огороженная. Детям раздолье погулять. Есть детская площадка с неимоверным количеством игрушек. Территория самого домика закрыта с трех сторон, так, что окна и терраса смотрят на лес без забора. Это создаёт невероятную атмосферу.',
      room_type: 'aframe',
    },
    {
      id: 3,
      guest_name: 'Дилия Спиридонова',
      rating: 5,
      text: '"Ветка" стала идеальным местом для нашего семейного отдыха. Приезжаем сюда не первый год. Просыпаться под пение птиц, завтракать на террасе, вечером расслабляться в чане под открытым небом - что может быть лучше? Атмосфера уединения и уюта, внимательный персонал и красота вокруг создают незабываемые впечатления!!! Здесь можно по-настоящему отдохнуть душой! Обязательно вернёмся снова и снова!!! "Ветка" - это любовь навсегда!!!',
      room_type: 'barrel',
    },
    {
      id: 4,
      guest_name: 'Камилла Яруллина',
      rating: 5,
      text: 'Прекрасное место для проведения дня рождения 🌸 в кругу близких. Очень чистые домики, приветливые администраторы, крутая кедровая баня!',
      room_type: 'dome',
    },
    {
      id: 5,
      guest_name: 'Марина К.',
      rating: 5,
      text: 'Отличный глэмпинг для отдыха на природе. А-фрейм домики чисто ухоженные, в доме есть все необходимое: колонка Алиса, проектор, специи, чай. Жарили шашлыки, парились в бане-бочке.',
      room_type: 'aframe',
    },
    {
      id: 6,
      guest_name: 'Гузель Н.',
      rating: 5,
      text: 'Замечательный глэмпинг в сосновом бору! Очень уютные купольные шатры с тёплым полом. Вид из окна завораживает.',
      room_type: 'dome',
    },
  ];

  const insertManyReviews = database.transaction((items) => {
    for (const item of items) insertReview.run(item);
  });
  insertManyReviews(reviews);

  return database;
}

function getDbPath() {
  return DB_PATH;
}

module.exports = {
  getDb,
  initDatabase,
  getDbPath
};
