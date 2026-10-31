
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id INTEGER PRIMARY KEY,

    operation_type TEXT NOT NULL
        CHECK (operation_type IN ('income', 'expense')),

    step TEXT NOT NULL
        CHECK (step IN ('waiting_amount', 'waiting_category')),

    amount_minor INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
