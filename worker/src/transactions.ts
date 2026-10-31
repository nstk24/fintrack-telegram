
export type TransactionType = "income" | "expense";

export interface TransactionSummary {
  income: number;
  expense: number;
  balance: number;
}


export async function addTransaction(
  db: D1Database,
  telegramId: number,
  updateId: number,
  type: TransactionType,
  amountRub: number,
  category: string
): Promise<"saved" | "duplicate" | "error"> {
  if (
    !Number.isSafeInteger(Math.round(amountRub * 100)) ||
    amountRub <= 0 ||
    !category.trim()
  ) {
    return "error";
  }

  const amountMinor = Math.round(amountRub * 100);

  const result = await db.prepare(`
    INSERT INTO transactions (
      user_id,
      type,
      amount_minor,
      currency,
      category,
      telegram_update_id
    )
    SELECT id, ?, ?, 'RUB', ?, ?
    FROM users
    WHERE telegram_id = ?
    ON CONFLICT(telegram_update_id) DO NOTHING
  `)
    .bind(
      type,
      amountMinor,
      category.trim(),
      updateId,
      telegramId
    )
    .run();

  if (result.meta.changes === 1) {
    return "saved";
  }

  const existing = await db.prepare(`
    SELECT id
    FROM transactions
    WHERE telegram_update_id = ?
  `)
    .bind(updateId)
    .first<{ id: number }>();

  return existing ? "duplicate" : "error";
}


export async function getTransactionSummary(
  db: D1Database,
  telegramId: number
): Promise<TransactionSummary> {
  const rows = await db.prepare(`
    SELECT
      type,
      COALESCE(SUM(amount_minor), 0) AS total
    FROM transactions
    WHERE user_id = (
      SELECT id FROM users WHERE telegram_id = ?
    )
    AND currency = 'RUB'
    GROUP BY type
  `)
    .bind(telegramId)
    .all<{ type: TransactionType; total: number }>();

  const income = rows.results.find(
    row => row.type === "income"
  )?.total ?? 0;

  const expense = rows.results.find(
    row => row.type === "expense"
  )?.total ?? 0;

  return {
    income: income / 100,
    expense: expense / 100,
    balance: (income - expense) / 100
  };
}
