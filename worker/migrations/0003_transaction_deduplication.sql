
ALTER TABLE transactions
ADD COLUMN telegram_update_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_update_id
ON transactions(telegram_update_id);
