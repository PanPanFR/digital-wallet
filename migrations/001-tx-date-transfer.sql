-- Rebuild transactions: add date + to_wallet_id + transfer type. Preserves rows.
-- No explicit BEGIN/COMMIT: `wrangler d1 execute --file` runs atomically;
-- local miniflare rejects raw transaction statements.
CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  to_wallet_id TEXT REFERENCES wallets(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT DEFAULT 'Lainnya',
  type TEXT DEFAULT 'expense' CHECK (type IN ('income','expense','transfer')),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO transactions_new (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at, updated_at)
SELECT id, wallet_id, NULL, description, amount, category, type, COALESCE(substr(created_at, 1, 10), date('now')), created_at, updated_at
FROM transactions;
DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
