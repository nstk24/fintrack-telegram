
type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

export type AuthenticatedUser = {
  id: number;
  first_name: string;
  username: string | null;
};

export async function authenticateTelegramUser(): Promise<AuthenticatedUser> {
  const webApp = getTelegramWebApp();

  if (!webApp?.initData) {
    throw new Error("Открой приложение через Telegram-бота");
  }

  webApp.ready();
  webApp.expand();

  const response = await fetch(
    "https://fintrack-api.nstk24.workers.dev/api/me",
    {
      method: "GET",
      headers: {
        Authorization: `tma ${webApp.initData}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Авторизация Telegram не прошла"
        : `Ошибка сервера: ${response.status}`
    );
  }

  return (await response.json()) as AuthenticatedUser;
}


export type FinanceSummary = {
  income: number;
  expense: number;
  balance: number;
  currency: string;
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const webApp = getTelegramWebApp();

  if (!webApp?.initData) {
    throw new Error("Нет данных авторизации Telegram");
  }

  const response = await fetch(
    "https://fintrack-api.nstk24.workers.dev/api/finance/summary",
    {
      method: "GET",
      headers: {
        Authorization: `tma ${webApp.initData}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить финансы: ${response.status}`
    );
  }

  return (await response.json()) as FinanceSummary;
}
