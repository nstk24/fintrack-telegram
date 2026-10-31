import { validateTelegramInitData } from "./auth";
import { registerUser, type TelegramUser } from "./db";

import {
  addTransaction,
  getTransactionSummary,
  getTransactionHistory,
  deleteTransaction,
  type TransactionType
} from "./transactions";



import {
  getSession,
  startSession,
  setSessionAmount,
  cancelSession,
  finishSession
} from "./sessions";



import {
  getCategory,
  createCategoryKeyboard
} from "./categories";




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

 
callback_query?: {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: {
    message_id: number;
    chat: {
      id: number;
    };
  };
};

}



const mainKeyboard = {
  keyboard: [
    [
      { text: "💰 Мои финансы" },
      { text: "📋 История операций" }
    ],
    [
      { text: "💵 Курсы валют" },
      { text: "₿ Криптовалюты" }
    ],
    [
      { text: "➕ Добавить доход" },
      { text: "➖ Добавить расход" }
    ]
  ],
  resize_keyboard: true,
  is_persistent: true
};



async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
  showKeyboard: boolean = false
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
        text: text,
        ...(showKeyboard
          ? { reply_markup: mainKeyboard }
          : {})
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Telegram API error: ${response.status}`
    );
  }

  const result = await response.json() as {
    ok: boolean
  };

  if (!result.ok) {
    throw new Error("Telegram rejected the message");
  }
}


async function sendCategoryKeyboard(
  env: Env,
  chatId: number,
  type: TransactionType
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
        text: "📁 Выбери категорию:",
        reply_markup: createCategoryKeyboard(type)
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send category keyboard");
  }
}



async function sendHistory(
  env: Env,
  chatId: number,
  telegramId: number
): Promise<void> {
  const transactions = await getTransactionHistory(
    env.DB,
    telegramId
  );

  if (transactions.length === 0) {
    await sendMessage(
      env,
      chatId,
      "📋 История операций пока пуста."
    );
    return;
  }

  const lines = transactions.map((t) => {
    const income = t.type === "income";
    const amount = (t.amount_minor / 100)
      .toLocaleString("ru-RU");

    const date = t.created_at
      .slice(5, 16)
      .replace("-", ".");

    return (
      `${income ? "🟢" : "🔴"} ${t.category}\n` +
      `     ${income ? "+" : "−"}${amount} ₽ · ${date}`
    );
  });

  const text =
    "📋 История операций\n\n" +
    lines.join("\n\n") +
    "\n\n👇 Выбери операцию для удаления:";

  const buttons = transactions.map((t, index) => ({
    text: `${index + 1}. ${t.category}`,
    callback_data: `delete:${t.id}`
  }));

  const keyboard = [];

  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: keyboard
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send history");
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

  
if (update.callback_query) {
  const callback = update.callback_query;
  const chatId = callback.message?.chat.id;

  // Подтверждаем нажатие кнопки Telegram
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        callback_query_id: callback.id
      })
    }
  );

if (chatId && callback.data?.startsWith("delete:")) {
  const idText = callback.data.slice("delete:".length);
  const transactionId = Number(idText);

  if (
    !/^[1-9]\d*$/.test(idText) ||
    !Number.isSafeInteger(transactionId)
  ) {
    return new Response("OK");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "⚠️ Ты действительно хочешь удалить операцию?",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Да, удалить",
                callback_data: `confirm_delete:${transactionId}`
              },
              {
                text: "❌ Отмена",
                callback_data: "cancel_delete"
              }
            ]
          ]
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send deletion confirmation");
  }

  return new Response("OK");
}

if (chatId && callback.data === "cancel_delete") {
  await sendMessage(env, chatId, "Удаление отменено.");
  return new Response("OK");
}

if (chatId && callback.data?.startsWith("confirm_delete:")) {
  const idText = callback.data.slice(
    "confirm_delete:".length
  );
  const transactionId = Number(idText);

  if (
    !/^[1-9]\d*$/.test(idText) ||
    !Number.isSafeInteger(transactionId)
  ) {
    return new Response("OK");
  }

  const deleted = await deleteTransaction(
    env.DB,
    callback.from.id,
    transactionId
  );

  await sendMessage(
    env,
    chatId,
    deleted
      ? "✅ Операция успешно удалена."
      : "❌ Операция не найдена или уже удалена."
  );

  return new Response("OK");
}

  if (!chatId || !callback.data?.startsWith("category:")) {
    return new Response("OK");
  }

  const parts = callback.data.split(":");
  const type = parts[1];
  const indexText = parts[2] ?? "";

  if (
    parts.length !== 3 ||
    (type !== "income" && type !== "expense") ||
    !/^\d+$/.test(indexText)
  ) {
    return new Response("OK");
  }

  const category = getCategory(type, Number(indexText));
  const telegramId = callback.from.id;

  const session = await getSession(env.DB, telegramId);

  if (
    !category ||
    !session ||
    session.step !== "waiting_category" ||
    session.operation_type !== type ||
    session.amount_minor === null
  ) {
    await sendMessage(
      env,
      chatId,
      "⚠️ Этот выбор уже неактуален. Начни добавление заново."
    );
    return new Response("OK");
  }

  const amount = session.amount_minor / 100;

  const result = await finishSession(
    env.DB,
    telegramId,
    update.update_id,
    category
  );

  

  if (result === "saved") {
    await sendMessage(
      env,
      chatId,
      `✅ ${type === "income" ? "Доход" : "Расход"} сохранён!\n\n` +
      `💰 Сумма: ${amount.toLocaleString("ru-RU")} ₽\n` +
      `📁 Категория: ${category}`
    );
  } else if (result === "error") {
    await sendMessage(
      env,
      chatId,
      "⚠️ Не удалось сохранить операцию."
    );
  }

  return new Response("OK");
}

const message = update.message;

if (!message?.text) {
  return new Response("OK");
}




const chatId = message.chat.id;

const messageText = message.text.trim();

const buttonCommands: Record<string, string> = {
  "💰 Мои финансы": "/balance",
  "📋 История операций": "/history",
  "💵 Курсы валют": "/rates",
  "₿ Криптовалюты": "/crypto",
  "➕ Добавить доход": "/add_income",
  "➖ Добавить расход": "/add_expense"
};

const command =
  buttonCommands[messageText] ??
  messageText.split(/\s+/)[0]
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

 
const result = await addTransaction(
  env.DB,
  message.from.id,
  update.update_id,
  type,
  amount,
  category
);


 
const reply =
  result === "saved"
    ? `✅ ${type === "expense" ? "Расход" : "Доход"} сохранён!\n\n` +
      `💰 Сумма: ${amount.toLocaleString("ru-RU")} ₽\n` +
      `📁 Категория: ${category}`
    : result === "duplicate"
      ? "ℹ️ Эта операция уже была обработана."
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


if (command === "/history") {
  if (!message.from) {
    return new Response("Sender not found", { status: 400 });
  }

  await sendHistory(
    env,
    chatId,
    message.from.id
  );

  return new Response("OK");
}


if (command === "/delete") {
  if (!message.from) {
    return new Response("Sender not found", { status: 400 });
  }

  const parts = message.text.trim().split(/\s+/);
  const idText = parts[1] ?? "";
  const transactionId = Number(idText);

  if (
    parts.length !== 2 ||
    !/^[1-9]\d*$/.test(idText) ||
    !Number.isSafeInteger(transactionId)
  ) {
    await sendMessage(
      env,
      chatId,
      "⚠️ Укажи корректный ID операции.\n\n" +
      "Пример: /delete 3\n\n" +
      "Посмотреть ID можно через /history."
    );

    return new Response("OK");
  }

  const deleted = await deleteTransaction(
    env.DB,
    message.from.id,
    transactionId
  );

  await sendMessage(
    env,
    chatId,
    deleted
      ? `✅ Операция #${transactionId} удалена.`
      : "❌ Операция не найдена или у тебя нет доступа к ней."
  );

  return new Response("OK");
}


if (command === "/add_income" || command === "/add_expense") {
  if (!message.from) {
    return new Response("Sender not found", { status: 400 });
  }

  const type =
    command === "/add_income" ? "income" : "expense";

  const started = await startSession(
    env.DB,
    message.from.id,
    type
  );

  await sendMessage(
    env,
    chatId,
    started
      ? `💰 Введи сумму ${type === "income" ? "дохода" : "расхода"} в рублях.\n\n` +
        "Например: 350\n\n" +
        "Для отмены отправь /cancel."
      : "❌ Не удалось начать добавление операции."
  );

  return new Response("OK");
}


if (command === "/cancel") {
  if (message.from) {
    await cancelSession(env.DB, message.from.id);
  }

  await sendMessage(
    env,
    chatId,
    "❌ Добавление операции отменено."
  );

  return new Response("OK");
}


if (
  message.from &&
  !messageText.startsWith("/") &&
  !Object.prototype.hasOwnProperty.call(buttonCommands, messageText)
) {
  const session = await getSession(
    env.DB,
    message.from.id
  );

  if (session?.step === "waiting_amount") {
    const amountText = messageText.replace(",", ".");

    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {  
      await sendMessage(
        env,
        chatId,
        "⚠️ Введи корректную сумму.\nНапример: 350 или 350.50"
      );
      return new Response("OK");
    }

    const amount = Number(amountText);
    const amountMinor = Math.round(amount * 100);

    if (
      amount <= 0 ||
      !Number.isSafeInteger(amountMinor)
    ) {
      await sendMessage(
        env,
        chatId,
        "⚠️ Сумма должна быть положительным числом."
      );
      return new Response("OK");
    }

    const saved = await setSessionAmount(
      env.DB,
      message.from.id,
      amountMinor
    );

    
if (saved) {
  await sendMessage(
    env,
    chatId,
    `✅ Сумма ${amount.toLocaleString("ru-RU")} ₽ принята!`
  );

  await sendCategoryKeyboard(
    env,
    chatId,
    session.operation_type
  );
} else {
  await sendMessage(
    env,
    chatId,
    "❌ Не удалось сохранить сумму."
  );
}


    return new Response("OK");
  }
}


  switch (command) {
    case "/start":
    reply =
      `Привет, ${message.from?.first_name || "друг"}! 👋\n\n` +
      "Добро пожаловать в FinTrack! 💰\n\n" +
      "Здесь ты сможешь:\n" +
      "💵 Отслеживать курсы валют\n" +
      "₿ Следить за криптовалютами\n" +
      "📊 Учитывать доходы и расходы\n\n" +
      "Используй кнопки меню ниже 👇";
    break;

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
    "/balance — Финансовая сводка\n" +
    "/history — Последние 10 операций\n" +
    "/delete 3 — Удалить операцию по ID";
     break;

    case "/rates":
      reply = "💵 Модуль курсов валют скоро появится!";
      break;

    case "/crypto":
      reply = "₿ Модуль криптовалют в разработке!";
      break;

    default:
      reply = "Неизвестная команда. Отправь /help";
  }

  await sendMessage(
  env,
  chatId,
  reply,
  command === "/start"
);

return new Response("OK");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://fintrack-app-4tt.pages.dev",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin"
    };

    // Браузер предварительно проверяет разрешение на запрос.
    if (
     ["/api/me", "/api/finance/summary"].includes(url.pathname) &&
     request.method === "OPTIONS"
    ) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    // Авторизация пользователя Telegram Mini App
    if (url.pathname === "/api/me") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { ...corsHeaders, Allow: "GET" }
        });
      }

      const initData = request.headers
        .get("Authorization")
        ?.replace(/^tma\s+/i, "");

      if (!initData) {
        return Response.json(
        { error: "Telegram authorization required" },
        { status: 401, headers: corsHeaders }
        );
      }

      const user = await validateTelegramInitData(
        initData,
        env.TELEGRAM_BOT_TOKEN
      );

      if (!user) {
        return Response.json(
        { error: "Invalid or expired Telegram authorization" },
        { status: 401, headers: corsHeaders }
       );
        
      }

      return Response.json(
      {
      id: user.id,
      first_name: user.first_name,
      username: user.username ?? null
      },
      { headers: corsHeaders }
      );
    }

    // Финансовая сводка авторизованного пользователя
    if (url.pathname === "/api/finance/summary") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Method not allowed" },
          {
            status: 405,
            headers: { ...corsHeaders, Allow: "GET" }
          }
        );
      }

      const initData = request.headers
        .get("Authorization")
        ?.replace(/^tma\s+/i, "");

      if (!initData) {
        return Response.json(
          { error: "Telegram authorization required" },
          { status: 401, headers: corsHeaders }
        );
      }

      const user = await validateTelegramInitData(
        initData,
        env.TELEGRAM_BOT_TOKEN
      );

      if (!user) {
        return Response.json(
          { error: "Invalid or expired Telegram authorization" },
          { status: 401, headers: corsHeaders }
        );
      }

      // Используем ID только из проверенных данных Telegram.
      const summary = await getTransactionSummary(
        env.DB,
        user.id
      );

      return Response.json(
        {
          income: summary.income,
          expense: summary.expense,
          balance: summary.balance,
          currency: "RUB"
        },
        { headers: corsHeaders }
      );
    }

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
