-- Debts: two-way (owe/owed) with partial payments. Never touches transactions/wallets.
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('owe','owed')),
  amount REAL NOT NULL CHECK (amount > 0),
  paid REAL NOT NULL DEFAULT 0 CHECK (paid >= 0),
  wallet_id TEXT REFERENCES wallets(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount > 0),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debts_direction ON debts(direction);
