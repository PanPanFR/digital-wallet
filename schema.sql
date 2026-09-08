-- Cloudflare D1 Schema for Digital Wallet
-- Single-user personal wallet app

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('digital','cash')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT DEFAULT 'Lainnya',
  type TEXT DEFAULT 'expense' CHECK (type IN ('income','expense')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

-- Seed default wallets (fixed ids; INSERT OR IGNORE keeps re-apply idempotent)
INSERT OR IGNORE INTO wallets (id, name, kind) VALUES
  ('seed-cash', 'Tunai', 'cash'),
  ('seed-digital', 'Dompet Digital', 'digital');
