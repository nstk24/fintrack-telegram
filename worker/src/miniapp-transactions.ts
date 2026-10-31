
export type MiniAppTransactionInput = {
  type: "income" | "expense";
  amount_minor: number;
  category: string;
  client_request_id: string;
};

export type AddMiniAppTransactionResult =
  | "saved"
  | "duplicate"
  | "user_not_found"
  | "conflict";

export async function addMiniAppTransaction(
  db: D1Database,
  telegramId: number,
  input: MiniAppTransactionInput
): Promise<AddMiniAppTransactionResult> {

  // Находим внутренний ID пользователя в D1.
  const user = await db.prepare(
    "SELECT id FROM users WHERE telegram_id = ?"
  )
    .bind(telegramId)
    .first<{ id: number }>();

  if (!user) {
    return "user_not_found";
  }

  // Проверяем, не был ли этот запрос уже обработан.
  const existing = await db.prepare(
    `SELECT user_id, type, amount_minor, category
     FROM transactions
     WHERE client_request_id = ?`
  )
    .bind(input.client_request_id)
    .first<{
      user_id: number;
      type: string;
      amount_minor: number;
      category: string;
    }>();

  if (existing) {
    const sameTransaction =
      existing.user_id === user.id &&
      existing.type === input.type &&
      existing.amount_minor === input.amount_minor &&
      existing.category === input.category;

    return sameTransaction ? "duplicate" : "conflict";
  }

  // Записываем новую операцию.
  const result = await db.prepare(
    `INSERT INTO transactions (
      user_id,
      type,
      amount_minor,
      currency,
      category,
      client_request_id
    )
    VALUES (?, ?, ?, 'RUB', ?, ?)
    ON CONFLICT(client_request_id) DO NOTHING`
  )
    .bind(
      user.id,
      input.type,
      input.amount_minor,
      input.category,
      input.client_request_id
    )
    .run();

  if ((result.meta.changes ?? 0) > 0) {
    return "saved";
  }

  // Возможна одновременная отправка двух запросов.
  const repeated = await db.prepare(
    `SELECT user_id, type, amount_minor, category
     FROM transactions
     WHERE client_request_id = ?`
  )
    .bind(input.client_request_id)
    .first<{
      user_id: number;
      type: string;
      amount_minor: number;
      category: string;
    }>();

  if (
    repeated?.user_id === user.id &&
    repeated.type === input.type &&
    repeated.amount_minor === input.amount_minor &&
    repeated.category === input.category
  ) {
    return "duplicate";
  }

  return "conflict";
}
