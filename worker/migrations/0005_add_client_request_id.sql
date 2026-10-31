
-- Уникальный идентификатор операции, созданной в Mini App
ALTER TABLE transactions
ADD COLUMN client_request_id TEXT;

-- Защита от повторного сохранения одной операции
CREATE UNIQUE INDEX IF NOT EXISTS
idx_transactions_client_request_id
ON transactions(client_request_id);
