
import { useEffect, useState } from "react";
import {
  authenticateTelegramUser,
  type AuthenticatedUser
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

const transactions: Transaction[] = [
  {
    id: 1,
    name: "Зарплата",
    category: "Работа",
    amount: 25000,
    type: "income",
    date: "31 октября"
  },
  {
    id: 2,
    name: "Продукты",
    category: "Покупки",
    amount: 350,
    type: "expense",
    date: "31 октября"
  },
  {
    id: 3,
    name: "Подработка",
    category: "Дополнительный доход",
    amount: 500,
    type: "income",
    date: "30 октября"
  },
  {
    id: 4,
    name: "Кофе",
    category: "Кафе",
    amount: 220,
    type: "expense",
    date: "30 октября"
  },
  {
    id: 5,
    name: "Метро",
    category: "Транспорт",
    amount: 90,
    type: "expense",
    date: "29 октября"
  }
];

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


  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

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
              <p>Финансовые данные пока демонстрационные</p>
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
                onClick={() => setActiveTab("finance")}
              >
                <span className="quick-action-icon">
                  <Plus size={20} />
                </span>
                <span>Операции</span>
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

              {renderTransactions(transactions.slice(0, 4))}
            </section>

            <div className="demo-notice">
              Данные на экране пока демонстрационные.
              Синхронизацию с Telegram подключим позже.
            </div>
          </>
        )}

        {activeTab === "finance" && (
          <section className="section page-section">
            <div className="greeting">
              <h2>Мои финансы</h2>
              <p>История доходов и расходов</p>
            </div>

            <div className="summary-card">
              <span>Финансовый результат</span>
              <strong>{formatMoney(balance)} ₽</strong>
            </div>

            <div className="section-header">
              <h3>Все операции</h3>
            </div>

            {renderTransactions(transactions)}

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
    </div>
  );
}

export default App;
