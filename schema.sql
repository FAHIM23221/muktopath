-- মুক্তপাঠ — Cloudflare D1 (SQLite) স্কিমা
-- চালানোর নিয়ম: wrangler d1 execute <DB_NAME> --remote --file=schema.sql
-- (লোকাল টেস্টে --local ব্যবহার করুন)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,   -- PBKDF2-SHA256, hex
  salt          TEXT NOT NULL,   -- hex
  iterations    INTEGER NOT NULL DEFAULT 100000,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,  -- কুকিতে থাকে কাঁচা টোকেন, DB-তে শুধু SHA-256 হ্যাশ
  admin_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

-- লগইন রেট-লিমিটের জন্য (ব্যর্থ চেষ্টা গোনা হয়)
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier   TEXT NOT NULL,  -- email + IP
  success      INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(identifier, attempted_at);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  short_code     TEXT NOT NULL UNIQUE,  -- /s/<code> শর্ট লিংকের জন্য
  description    TEXT DEFAULT '',
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  file_type      TEXT DEFAULT '',       -- pdf, zip, docx, link ইত্যাদি
  file_key       TEXT DEFAULT '',       -- R2 অবজেক্ট কী (থাকলে)
  external_url   TEXT DEFAULT '',       -- R2 না থাকলে বাইরের লিংক
  cover_url      TEXT DEFAULT '',
  file_size      TEXT DEFAULT '',       -- প্রদর্শনের জন্য, যেমন "2.4 MB"
  tags           TEXT DEFAULT '',       -- কমা-দিয়ে আলাদা
  is_featured    INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status, created_at);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);

CREATE TABLE IF NOT EXISTS downloads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_agent  TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_downloads_resource ON downloads(resource_id, created_at);

CREATE TABLE IF NOT EXISTS support_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  method      TEXT NOT NULL DEFAULT 'bkash' CHECK (method IN ('bkash','nagad')),
  amount      INTEGER NOT NULL CHECK (amount > 0),  -- টাকায়
  trx_id      TEXT NOT NULL UNIQUE,                  -- ডুপ্লিকেট Trx অটো আটকাবে
  message     TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_payments(status, created_at);

CREATE TABLE IF NOT EXISTS donations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  method      TEXT NOT NULL DEFAULT 'bkash' CHECK (method IN ('bkash','nagad')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  trx_id      TEXT NOT NULL UNIQUE,
  message     TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status, created_at);

CREATE TABLE IF NOT EXISTS fund_expenses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  category      TEXT DEFAULT '',       -- যেমন: শিক্ষা, চিকিৎসা
  amount        INTEGER NOT NULL CHECK (amount > 0),
  spent_at      TEXT NOT NULL,         -- তারিখ (YYYY-MM-DD)
  proof_url     TEXT DEFAULT '',       -- প্রমাণের ছবি/লিংক
  note          TEXT DEFAULT '',
  beneficiaries INTEGER NOT NULL DEFAULT 0,  -- এই খরচে কতজন উপকৃত
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  contact    TEXT NOT NULL,   -- ইমেইল / WhatsApp নম্বর / Facebook আইডি
  channel    TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp','facebook')),
  topic      TEXT DEFAULT 'general',  -- general, download, support, request, other
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','replied')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  page       TEXT NOT NULL CHECK (page IN ('support','good-cause')),
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page, status, created_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ---------- ডিফল্ট ক্যাটাগরি ----------
INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES
  ('বই', 'books', 'পড়ার মতো বই ও ই-বই', 1),
  ('গাইড', 'guides', 'ধাপে ধাপে শেখার গাইড', 2),
  ('টেমপ্লেট', 'templates', 'তৈরি টেমপ্লেট ও ফরম্যাট', 3),
  ('টুলস', 'tools', 'দরকারি টুল ও সফটওয়্যার', 4),
  ('দরকারি লিংক', 'links', 'যাচাই করা উপকারী ওয়েব লিংক', 5);

-- ---------- ডিফল্ট সেটিংস (অ্যাডমিন প্যানেল থেকে বদলানো যাবে) ----------
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', 'মুক্তপাঠ'),
  ('tagline', 'শেখা হোক বাধাহীন'),
  ('hero_title', 'দরকারি রিসোর্স, এক ঠিকানায় — সম্পূর্ণ ফ্রি'),
  ('hero_subtitle', 'বই, গাইড, টেমপ্লেট আর টুলস — অ্যাকাউন্ট ছাড়াই ডাউনলোড করুন। ইচ্ছে হলে পাশে দাঁড়ান, আপনার সাপোর্টের ১০% পৌঁছে যাবে কারও প্রয়োজন মেটাতে।'),
  ('bkash_number', ''),
  ('nagad_number', ''),
  ('contact_email', ''),
  ('facebook_url', ''),
  ('youtube_url', ''),
  ('beneficiaries_count', '0'),
  ('about_text', 'এই লাইব্রেরিটি সবার জন্য উন্মুক্ত। প্রতিটি রিসোর্স ফ্রি। সাপোর্ট সম্পূর্ণ ঐচ্ছিক — যাচাই হওয়া প্রতিটি সাপোর্টের ১০% যায় ভালো কাজের ফান্ডে, আর প্রতিটি খরচ প্রমাণসহ এখানেই প্রকাশিত হয়।');
