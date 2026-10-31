
import type { TransactionType } from "./transactions";

export type SessionStep =
  | "waiting_amount"
  | "waiting_category";

export interface UserSession {
  user_id: number;
  operation_type: TransactionType;
  step: SessionStep;
  amount_minor: number | null;
}

// Получить текущий этап диалога
export async function getSession(
  db: D1Database,
  telegramId: number
): Promise<UserSession | null> {
  return db.prepare(`
    SELECT s.user_id, s.operation_type,
           s.step, s.amount_minor
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE u.telegram_id = ?
  `)
    .bind(telegramId)
    .first<UserSession>();
}

// Начать добавление дохода или расхода
export async function startSession(
  db: D1Database,
  telegramId: number,
  type: TransactionType
): Promise<boolean> {
  const result = await db.prepare(`
    INSERT INTO user_sessions (
      user_id, operation_type, step, amount_minor
    )
    SELECT id, ?, 'waiting_amount', NULL
    FROM users
    WHERE telegram_id = ?
    ON CONFLICT(user_id) DO UPDATE SET
      operation_type = excluded.operation_type,
      step = 'waiting_amount',
      amount_minor = NULL,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(type, telegramId)
    .run();

  return result.meta.changes === 1;
}

// Сохранить введённую сумму
export async function setSessionAmount(
  db: D1Database,
  telegramId: number,
  amountMinor: number
): Promise<boolean> {
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0
  ) {
    return false;
  }

  const result = await db.prepare(`
    UPDATE user_sessions
    SET step = 'waiting_category',
        amount_minor = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = (
      SELECT id FROM users WHERE telegram_id = ?
    )
    AND step = 'waiting_amount'
  `)
    .bind(amountMinor, telegramId)
    .run();

  return result.meta.changes === 1;
}

// Отменить диалог и удалить его состояние
export async function cancelSession(
  db: D1Database,
  telegramId: number
): Promise<void> {
  await db.prepare(`
    DELETE FROM user_sessions
    WHERE user_id = (
      SELECT id FROM users WHERE telegram_id = ?
    )
  `)
    .bind(telegramId)
    .run();
}


export async function finishSession(
  db: D1Database,
  telegramId: number,
  updateId: number,
  category: string
): Promise<
  "saved" | "duplicate" | "error"
> {
  if (
    !Number.isSafeInteger(updateId) ||
    !category.trim()
  ) {
    return "error";
  }

  const insert = db.prepare(`
    INSERT INTO transactions (
      user_id,
      type,
      amount_minor,
      currency,
      category,
      telegram_update_id
    )
    SELECT
      s.user_id,
      s.operation_type,
      s.amount_minor,
      'RUB',
      ?,
      ?
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE u.telegram_id = ?
      AND s.step = 'waiting_category'
      AND s.amount_minor > 0
    ON CONFLICT(telegram_update_id) DO NOTHING
  `).bind(category, updateId, telegramId);

  const removeSession = db.prepare(`
    DELETE FROM user_sessions
    WHERE user_id = (
      SELECT id FROM users WHERE telegram_id = ?
    )
    AND step = 'waiting_category'
    AND EXISTS (
      SELECT 1 FROM transactions
      WHERE telegram_update_id = ?
    )
  `).bind(telegramId, updateId);

  const results = await db.batch([
    insert,
    removeSession
  ]);

  if (results[0].meta.changes === 1) {
    return "saved";
  }

  const existing = await db.prepare(`
    SELECT id FROM transactions
    WHERE telegram_update_id = ?
  `)
    .bind(updateId)
    .first<{ id: number }>();

  return existing ? "duplicate" : "error";
}
