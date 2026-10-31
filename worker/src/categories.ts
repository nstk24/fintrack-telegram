
import type { TransactionType } from "./transactions";

export const categories = {
  expense: [
    "🛒 Продукты",
    "🚇 Транспорт",
    "☕ Кафе",
    "🏠 Жильё",
    "🎮 Развлечения",
    "📦 Другое"
  ],
  income: [
    "💼 Зарплата",
    "🎓 Стипендия",
    "💻 Подработка",
    "🎁 Подарки",
    "📦 Другое"
  ]
};

export function getCategory(
  type: TransactionType,
  index: number
): string | null {
  return categories[type][index] ?? null;
}

export function createCategoryKeyboard(
  type: TransactionType
) {
  const buttons = categories[type].map((name, index) => ({
    text: name,
    callback_data: `category:${type}:${index}`
  }));

  const rows = [];

  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  return {
    inline_keyboard: rows
  };
}
