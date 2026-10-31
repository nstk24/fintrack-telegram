
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: {
      id: number;
    };
    from?: {
      first_name?: string;
    };
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

  let reply: string;

  switch (command) {
    case "/start":
      reply =
        `Привет, ${message.from?.first_name || "друг"}! 👋\n\n` +
        "Добро пожаловать в FinTrack! 💰\n\n" +
        "Здесь ты сможешь:\n" +
        "💵 Отслеживать курсы валют\n" +
        "₿ Следить за криптовалютами\n" +
        "📊 Учитывать доходы и расходы\n\n" +
        "Для списка команд отправь /help";
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
