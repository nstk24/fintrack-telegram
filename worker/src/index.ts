import { registerUser, type TelegramUser } from "./db";

import {
  addTransaction,
  getTransactionSummary,
  type TransactionType
} from "./transactions";

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  DB: D1Database;
}


interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: {
      id: number;
    };
    from?: TelegramUser;
  };
}


async function sendMessage(
  env: Env,
  chatId: number,
  text: string
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const result = await response.json() as { ok: boolean };

  if (!result.ok) {
    throw new Error("Telegram rejected the message");
  }
}

async function handleTelegram(
  request: Request,
  env: Env
): Promise<Response> {
  const secret = request.headers.get(
    "X-Telegram-Bot-Api-Secret-Token"
  );

  if (!env.TELEGRAM_WEBHOOK_SECRET ||
      secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = update.message;

  if (!message?.text) {
    return new Response("OK");
  }


const chatId = message.chat.id;

const command = message.text.trim().split(/\s+/)[0]
  .split("@")[0].toLowerCase();

// Регистрируем пользователя или обновляем его данные
if (message.from) {
  await registerUser(env.DB, message.from);
}


  let reply: string;

  
if (command === "/expense" || command === "/income") {
  if (!message.from) {
    return new Response("Sender not found", { status: 400 });
  }

  const parts = message.text.trim().split(/\s+/);
  const amountText = parts[1]?.replace(",", ".");
  const amount = Number(amountText);
  const category = parts.slice(2).join(" ").trim();

  if (
    !amountText ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !/^\d+(?:[.,]\d{1,2})?$/.test(parts[1] ?? "") ||
    !category ||
    category.length > 100
  ) {
    await sendMessage(
      env,
      chatId,
      "⚠️ Неверный формат.\n\n" +
      "Примеры:\n" +
      "/expense 350 Продукты\n" +
      "/income 25000 Зарплата"
    );

    return new Response("OK");
  }

  const type: TransactionType =
    command === "/expense" ? "expense" : "income";

  const saved = await addTransaction(
    env.DB,
    message.from.id,
    type,
    amount,
    category
  );

  const reply = saved
    ? `✅ ${type === "expense" ? "Расход" : "Доход"} сохранён!\n\n` +
      `💰 Сумма: ${amount.toLocaleString("ru-RU")} ₽\n` +
      `📁 Категория: ${category}`
    : "❌ Не удалось сохранить операцию.";

  await sendMessage(env, chatId, reply);

  return new Response("OK");
}

if (command === "/balance") {
  if (!message.from) {
    return new Response("Sender not found", { status: 400 });
  }

  const summary = await getTransactionSummary(
    env.DB,
    message.from.id
  );

  await sendMessage(
    env,
    chatId,
    "📊 Ваши финансы (за всё время)\n\n" +
    `🟢 Доходы: ${summary.income.toLocaleString("ru-RU")} ₽\n` +
    `🔴 Расходы: ${summary.expense.toLocaleString("ru-RU")} ₽\n` +
    `💰 Баланс: ${summary.balance.toLocaleString("ru-RU")} ₽`
  );

  return new Response("OK");
}

  switch (command) {
    case "/help":
  reply =
    "📋 Команды FinTrack:\n\n" +
    "/start — Главное меню\n" +
    "/help — Помощь\n" +
    "/rates — Курсы валют\n" +
    "/crypto — Криптовалюты\n\n" +
    "💰 Личные финансы:\n" +
    "/expense 350 Продукты — Добавить расход\n" +
    "/income 25000 Зарплата — Добавить доход\n" +
    "/balance — Финансовая сводка";
     break;

    case "/help":
      reply =
        "📋 Команды FinTrack:\n\n" +
        "/start — Главное меню\n" +
        "/help — Помощь\n" +
        "/rates — Курсы валют\n" +
        "/crypto — Криптовалюты\n" +
        "/balance — Личные финансы";
      break;

    case "/rates":
      reply = "💵 Модуль курсов валют скоро появится!";
      break;

    case "/crypto":
      reply = "₿ Модуль криптовалют в разработке!";
      break;

    case "/balance":
      reply = "📊 Учёт финансов скоро будет доступен!";
      break;

    default:
      reply = "Неизвестная команда. Отправь /help";
  }

  await sendMessage(env, chatId, reply);

  return new Response("OK");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" &&
        request.method === "GET") {
      return Response.json({
        status: "ok",
        application: "FinTrack",
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/" &&
        request.method === "GET") {
      return Response.json({
        application: "FinTrack",
        version: "1.0.0",
        status: "running"
      });
    }

    if (url.pathname === "/telegram/webhook" &&
        request.method === "POST") {
      return handleTelegram(request, env);
    }

    return Response.json(
      { error: "Route not found" },
      { status: 404 }
    );
  }
};
