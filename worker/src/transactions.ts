
export type TransactionType = "income" | "expense";

export interface TransactionSummary {
  income: number;
  expense: number;
  balance: number;
}

export async function addTransaction(
  db: D1Database,
  telegramId: number,
  type: TransactionType,
  amountRub: number,
  category: string
): Promise<boolean> {
  if (
    !Number.isSafeInteger(amountRub * 100) ||
    amountRub <= 0 ||
    !category.trim()
  ) {
    return false;
  }

  const amountMinor = Math.round(amountRub * 100);

  const result = await db.prepare(`
    INSERT INTO transactions (
      user_id, type, amount_minor, currency, category
    )
    SELECT id, ?, ?, 'RUB', ?
    FROM users
    WHERE telegram_id = ?
  `)
    .bind(type, amountMinor, category.trim(), telegramId)
    .run();

  return result.meta.changes === 1;
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
