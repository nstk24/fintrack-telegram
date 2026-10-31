
export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<TelegramUser | null> {
  if (!initData || !botToken || initData.length > 8192) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    const authDate = params.get("auth_date");
    const userString = params.get("user");

    if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) {
      return null;
    }

    if (!authDate || !/^\d+$/.test(authDate)) {
      return null;
    }

    if (!userString) {
      return null;
    }

    // Запрещаем повторяющиеся параметры.
    const keys: string[] = [];

    params.forEach((_value, key) => {
     keys.push(key);
    });

    if (new Set(keys).size !== keys.length) {
      return null;
    }

    // Проверяем, что данные не старше 24 часов.
    const now = Math.floor(Date.now() / 1000);
    const timestamp = Number(authDate);

    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp > now + 60 ||
      now - timestamp > 86400
    ) {
      return null;
    }

    // Формируем строку для проверки подписи Telegram.
    const entries: [string, string][] = [];

    params.forEach((value, key) => {
    if (key !== "hash") {
    entries.push([key, value]);
    }
   });
const dataCheckString = entries
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

    // Получаем секретный ключ из токена бота.
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const secretBytes = await crypto.subtle.sign(
      "HMAC",
      baseKey,
      encoder.encode(botToken)
    );

    // Проверяем подпись данных.
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(dataCheckString)
    );

    const expectedHash = bytesToHex(
      new Uint8Array(expectedSignature)
    );

    if (expectedHash !== hash.toLowerCase()) {
      return null;
    }

    // Подпись проверена, теперь можно доверять user.
    const user: unknown = JSON.parse(userString);

    if (
      typeof user !== "object" ||
      user === null ||
      !("id" in user) ||
      !("first_name" in user) ||
      typeof user.id !== "number" ||
      !Number.isSafeInteger(user.id) ||
      user.id <= 0 ||
      typeof user.first_name !== "string" ||
      !("username" in user
        ? user.username === undefined ||
          typeof user.username === "string"
        : true)
    ) {
      return null;
    }

    return user as TelegramUser;
  } catch {
    return null;
  }
}
