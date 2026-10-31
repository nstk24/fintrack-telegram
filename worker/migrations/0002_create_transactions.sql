
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    type TEXT NOT NULL
        CHECK (type IN ('income', 'expense')),

    amount_minor INTEGER NOT NULL
        CHECK (amount_minor > 0),

    currency TEXT NOT NULL DEFAULT 'RUB',

    category TEXT NOT NULL,

    description TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user
ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
ON transactions(user_id, created_at);
