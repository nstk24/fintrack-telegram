import { useState } from "react";
import { X } from "lucide-react";
import {
  createFinanceTransaction,
  type NewTransaction
} from "./telegram";

type TransactionType = "income" | "expense";

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

const categories = {
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

export default function TransactionForm({
  onClose,
  onSaved
}: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories.expense[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Сохраняем идентификатор для повторной попытки
  // отправки той же самой операции.
  const [request, setRequest] =
    useState<NewTransaction | null>(null);

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategory(categories[nextType][0]);
    setError("");
    setRequest(null);
  }

  function changeAmount(value: string) {
    setAmount(value);
    setError("");
    setRequest(null);
  }

  function changeCategory(value: string) {
    setCategory(value);
    setError("");
    setRequest(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const normalized = amount.trim().replace(",", ".");

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      setError("Введи корректную сумму, например 350 или 350.50");
      return;
    }

    const [rubles, kopecks = ""] = normalized.split(".");
    const minor =
      Number(rubles) * 100 +
      Number(kopecks.padEnd(2, "0"));

    if (
      !Number.isSafeInteger(minor) ||
      minor <= 0 ||
      minor > 100_000_000_000
    ) {
      setError("Укажи положительную сумму в допустимых пределах");
      return;
    }

    const transaction: NewTransaction = request ?? {
      type,
      amount_minor: minor,
      category,
      client_request_id: crypto.randomUUID()
    };

    setRequest(transaction);
    setSaving(true);
    setError("");

    try {
      const result = await createFinanceTransaction(transaction);

      if (result === "saved" || result === "duplicate") {
        onSaved();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить операцию"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-overlay">
      <section
        className="transaction-form"
        role="dialog"
        aria-modal="true"
        aria-label="Новая финансовая операция"
      >
        <div className="form-heading">
          <h2>Новая операция</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-type-switch">
            <button
              type="button"
              className={type === "expense" ? "selected" : ""}
              onClick={() => changeType("expense")}
              disabled={saving}
            >
              Расход
            </button>
            <button
              type="button"
              className={type === "income" ? "selected" : ""}
              onClick={() => changeType("income")}
              disabled={saving}
            >
              Доход
            </button>
          </div>

          <label className="form-label" htmlFor="amount">
            Сумма в рублях
          </label>

          <input
            id="amount"
            className="form-amount"
            type="text"
            inputMode="decimal"
            placeholder="Например, 350.50"
            value={amount}
            onChange={(e) => changeAmount(e.target.value)}
            disabled={saving}
            required
          />

          <p className="form-label">Категория</p>

          <div className="form-categories">
            {categories[type].map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "selected" : ""}
                onClick={() => changeCategory(item)}
                disabled={saving}
              >
                {item}
              </button>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="form-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? "Сохраняем..." : "Сохранить операцию"}
          </button>
        </form>
      </section>
    </div>
  );
}
