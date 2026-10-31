import TransactionForm from "./TransactionForm";
import { useEffect, useState } from "react";
import {
  authenticateTelegramUser,
  getFinanceSummary,
  getFinanceTransactions,
  type AuthenticatedUser,
  type FinanceSummary
} from "./telegram";

import {
  House,
  Wallet,
  ChartNoAxesCombined,
  ChartPie,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBasket,
  BriefcaseBusiness,
  Coffee,
  TrainFront,
  Plus,
  ChevronRight,
  Bell,
  Bitcoin,
  ArrowLeftRight
} from "lucide-react";

import "./App.css";

type Tab = "home" | "finance" | "markets" | "analytics";

type Transaction = {
  id: number;
  name: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

const formatMoney = (amount: number) =>
  amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

function TransactionIcon({ name }: { name: string }) {
  if (name === "Продукты") return <ShoppingBasket size={20} />;
  if (name === "Зарплата") return <BriefcaseBusiness size={20} />;
  if (name === "Кофе") return <Coffee size={20} />;
  if (name === "Метро") return <TrainFront size={20} />;

  return <Wallet size={20} />;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [financeSummary, setFinanceSummary] =
  useState<FinanceSummary | null>(null);

const [financeError, setFinanceError] = useState("");

  const [telegramUser, setTelegramUser] =
    useState<AuthenticatedUser | null>(null);

  const [authStatus, setAuthStatus] = useState(
    "Проверяем авторизацию..."
  );

  useEffect(() => {
    let active = true;

    authenticateTelegramUser()
      .then((user) => {
        if (!active) return;
        setTelegramUser(user);
        setAuthStatus("Telegram подтверждён");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthStatus(
          error instanceof Error
            ? error.message
            : "Ошибка авторизации"
        );
      });

    return () => {
      active = false;
    };
  }, []);


useEffect(() => {
  if (!telegramUser) return;

  let active = true;

  getFinanceSummary()
    .then((summary) => {
      if (!active) return;
      setFinanceSummary(summary);
      setFinanceError("");
    })
    .catch((error: unknown) => {
      if (!active) return;
      setFinanceError(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки финансов"
      );
    });

  return () => {
    active = false;
  };
}, [telegramUser, refreshKey]);


useEffect(() => {
  if (!telegramUser) return;

  let active = true;

  getFinanceTransactions()
    .then((items) => {
      if (!active) return;

      const formatted: Transaction[] = items.map((item) => {
        const dateParts = item.created_at.slice(0, 10).split("-");

        return {
          id: item.id,
          name: item.category,
          category: item.type === "income" ? "Доход" : "Расход",
          amount: item.amount_minor / 100,
          type: item.type,
          date:
            dateParts.length === 3
              ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
              : item.created_at
        };
      });

      setTransactions(formatted);
      setHistoryError("");
    })
    .catch((error: unknown) => {
      if (!active) return;

      setHistoryError(
        error instanceof Error
          ? error.message
          : "Не удалось получить историю"
      );
    })
    .finally(() => {
      if (active) setHistoryLoading(false);
    });

  return () => {
    active = false;
  };
}, [telegramUser, refreshKey]);


  const income = financeSummary?.income ?? 0;
  const expenses = financeSummary?.expense ?? 0;
  const balance = financeSummary?.balance ?? 0;
  const renderHistoryStatus = () => {
  if (!telegramUser) {
    return <div className="demo-notice">Ожидаем авторизацию Telegram.</div>;
  }

  if (historyLoading) {
    return <div className="demo-notice">Загружаем операции...</div>;
  }

  if (historyError) {
    return <div className="demo-notice">{historyError}</div>;
  }

  if (transactions.length === 0) {
    return <div className="demo-notice">Операций пока нет.</div>;
  }

  return null;
};


  const renderTransactions = (items: Transaction[]) => (
    <div className="transaction-list">
      {items.map((transaction) => (
        <div className="transaction-item" key={transaction.id}>
          <div className="transaction-icon">
            <TransactionIcon name={transaction.name} />
          </div>

          <div className="transaction-info">
            <div className="transaction-name">
              {transaction.name}
            </div>
            <div className="transaction-date">
              {transaction.category} · {transaction.date}
            </div>
          </div>

          <div
            className={`transaction-amount ${
              transaction.type === "income" ? "positive" : ""
            }`}
          >
            {transaction.type === "income" ? "+" : "−"}
            {formatMoney(transaction.amount)} ₽
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={23} />
          </div>

          <div>
            <h1>FinTrack</h1>
            <p>Твои финансы под контролем</p>
          </div>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Уведомления — скоро"
          disabled
        >
          <Bell size={21} />
        </button>
      </header>

      <main className="app-content">
        {activeTab === "home" && (
          <>
            <div className="greeting">
              <h2>
                {telegramUser
                  ? `Привет, ${telegramUser.first_name}! 👋`
                  : "Обзор финансов"}                
                
                </h2>
              <p>{authStatus}</p>
              <p>
                  {financeError
                  ? financeError
                  : financeSummary
                    ? "Финансовые данные из Cloudflare D1"
                    : "Загрузка финансовых данных..."}                  
              </p>
            </div>

            <section className="balance-card">
              <p className="balance-label">
                Финансовый результат
              </p>

              <h2>{formatMoney(balance)} ₽</h2>

              <div className="balance-divider" />

              <div className="balance-stats">
                <div className="stat">
                  <span className="stat-icon income-icon">
                    <ArrowDownLeft size={18} />
                  </span>
                  <div>
                    <p>Доходы</p>
                    <strong>+{formatMoney(income)} ₽</strong>
                  </div>
                </div>

                <div className="stat">
                  <span className="stat-icon expense-icon">
                    <ArrowUpRight size={18} />
                  </span>
                  <div>
                    <p>Расходы</p>
                    <strong>−{formatMoney(expenses)} ₽</strong>
                  </div>
                </div>
              </div>
            </section>

            <div className="quick-actions">
              <button
                type="button"
                onClick={() => setShowTransactionForm(true)}
              >
                <span className="quick-action-icon">
                  <Plus size={20} />
                </span>
                <span>Добавить</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("markets")}
              >
                <span className="quick-action-icon">
                  <ArrowLeftRight size={20} />
                </span>
                <span>Курсы валют</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
              >
                <span className="quick-action-icon">
                  <ChartPie size={20} />
                </span>
                <span>Аналитика</span>
              </button>
            </div>

            <section className="section">
              <div className="section-header">
                <h3>Последние операции</h3>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setActiveTab("finance")}
                >
                  Все <ChevronRight size={16} />
                </button>
              </div>

              {renderHistoryStatus()}
              {!historyLoading && !historyError &&
                renderTransactions(transactions.slice(0, 4))}
            </section>
          </>
        )}

        {activeTab === "finance" && (
          <section className="section page-section">
            <div className="greeting">
              <h2>Мои финансы</h2>
              <p>История доходов и расходов</p>
            </div>
              <button
              type="button"
              className="form-submit"
              onClick={() => setShowTransactionForm(true)}
            >
              + Добавить доход или расход
            </button>

            <div className="summary-card">
              <span>Финансовый результат</span>
              <strong>{formatMoney(balance)} ₽</strong>
            </div>

            <div className="section-header">
              <h3>Все операции</h3>
            </div>

            {renderHistoryStatus()}
            {!historyLoading && !historyError &&
              renderTransactions(transactions)}

            <div className="demo-notice">
              Добавление и удаление операций подключим
              после создания API.
            </div>
          </section>
        )}

        {activeTab === "markets" && (
          <section className="page-section">
            <div className="greeting">
              <h2>Финансовые рынки</h2>
              <p>Валюты и криптовалюты</p>
            </div>

            <div className="market-card">
              <ArrowLeftRight size={25} />
              <div>
                <strong>Курсы валют</strong>
                <p>USD, EUR, CNY, RUB</p>
              </div>
            </div>

            <div className="market-card">
              <Bitcoin size={26} />
              <div>
                <strong>Криптовалюты</strong>
                <p>Bitcoin, Ethereum, Solana</p>
              </div>
            </div>

            <div className="demo-notice">
              Рыночные API подключим на следующем этапе.
            </div>
          </section>
        )}

        {activeTab === "analytics" && (
          <section className="page-section">
            <div className="greeting">
              <h2>Аналитика</h2>
              <p>Статистика твоих финансов</p>
            </div>

            <div className="summary-card">
              <span>Всего доходов</span>
              <strong className="positive">
                +{formatMoney(income)} ₽
              </strong>
            </div>

            <div className="summary-card">
              <span>Всего расходов</span>
              <strong>−{formatMoney(expenses)} ₽</strong>
            </div>

            <div className="demo-notice">
              Здесь появятся графики, категории расходов
              и выбор периода.
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        {[
          { id: "home", label: "Главная", icon: House },
          { id: "finance", label: "Финансы", icon: Wallet },
          {
            id: "markets",
            label: "Рынки",
            icon: ChartNoAxesCombined
          },
          { id: "analytics", label: "Аналитика", icon: ChartPie }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={
                activeTab === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActiveTab(item.id as Tab)}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {showTransactionForm && (
      <TransactionForm
      onClose={() => setShowTransactionForm(false)}
      onSaved={() => {
      setShowTransactionForm(false);
      setRefreshKey((value) => value + 1);
      }}
      />
      )}
    </div>
  );
}

export default App;
