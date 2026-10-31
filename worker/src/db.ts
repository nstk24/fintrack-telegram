
export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

export async function registerUser(
  db: D1Database,
  user: TelegramUser
): Promise<void> {
  await db.prepare(`
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      last_active_at
    )
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id)
    DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_active_at = CURRENT_TIMESTAMP
  `)
    .bind(
      user.id,
      user.username ?? null,
      user.first_name ?? null
    )
    .run();
}
