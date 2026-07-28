import {
  LifelineSettings,
  Transaction,
  LifelineData,
  LifelineStats,
  TaxPayment,
  LifelineRecurringExpense,
  LifelineBackupPayload,
  RecurringFreq,
} from "@/types/lifeline";
import { getFamilyData, getNotifications, getRatesCatalog, addNotification, uid } from "@/utils/family";

const LIFELINE_STORAGE_KEY = "forex-lifeline-data";
const FAMILY_KEY = "family-data";
const NOTIF_KEY = "app-notifications";
const RATES_KEY = "family-rates-catalog";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CAD: 1.35,
  PKR: 278,
  AED: 3.67,
  SAR: 3.75,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83,
};

export const getLifelineData = (): LifelineData | null => {
  const stored = localStorage.getItem(LIFELINE_STORAGE_KEY);
  if (!stored) return null;
  try {
    const raw = JSON.parse(stored) as Partial<LifelineData>;
    if (!raw?.settings?.currency || !raw.settings.country) {
      console.error("Lifeline data missing required settings");
      return null;
    }
    const data: LifelineData = {
      settings: {
        autoSyncFamily: true,
        monthlyIncome: 0,
        ...raw.settings,
      },
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      taxPayments: Array.isArray(raw.taxPayments) ? raw.taxPayments : [],
      recurringExpenses: Array.isArray(raw.recurringExpenses) ? raw.recurringExpenses : [],
      externalCountryData: raw.externalCountryData,
      lastExchangeRateUpdate: raw.lastExchangeRateUpdate,
      cachedExchangeRate: raw.cachedExchangeRate,
      lastFamilySyncAt: raw.lastFamilySyncAt,
    };
    return data;
  } catch {
    console.error("Corrupt lifeline data in localStorage");
    return null;
  }
};

export const saveLifelineData = (data: LifelineData): void => {
  localStorage.setItem(LIFELINE_STORAGE_KEY, JSON.stringify(data));
};

export const initializeLifeline = (settings: LifelineSettings): void => {
  const data: LifelineData = {
    settings: { autoSyncFamily: true, ...settings },
    transactions: [],
    taxPayments: [],
    recurringExpenses: [],
  };
  saveLifelineData(data);
};

export const updateLifelineSettings = (
  patch: Partial<LifelineSettings>
): LifelineData | null => {
  const data = getLifelineData();
  if (!data) return null;
  data.settings = { ...data.settings, ...patch };
  saveLifelineData(data);
  return data;
};

export const addTransaction = (transaction: Transaction): void => {
  const data = getLifelineData();
  if (!data) return;

  data.transactions.push(transaction);
  saveLifelineData(data);
};

export const deleteTransaction = (id: string): void => {
  const data = getLifelineData();
  if (!data) return;

  data.transactions = data.transactions.filter((t) => t.id !== id);
  saveLifelineData(data);
};

// In-memory cache for exchange rates (per currency, per day)
const rateCache: Record<string, { rate: number; date: string }> = {};

export const getExchangeRate = async (targetCurrency: string): Promise<number> => {
  if (targetCurrency === "USD") return 1;

  const now = new Date();
  const todayStr = now.toDateString();

  if (rateCache[targetCurrency] && rateCache[targetCurrency].date === todayStr) {
    return rateCache[targetCurrency].rate;
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    const rates = await response.json();
    const rate = rates.rates[targetCurrency];

    if (!rate) throw new Error(`Rate for ${targetCurrency} not found`);

    for (const [currency, value] of Object.entries(rates.rates)) {
      rateCache[currency] = { rate: value as number, date: todayStr };
    }

    return rate;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);

    if (FALLBACK_RATES[targetCurrency]) {
      return FALLBACK_RATES[targetCurrency];
    }

    return 1;
  }
};

export const calculateTaxOwed = (
  data: LifelineData,
  _exchangeRate: number,
  overrideTaxRate?: number
): number => {
  const TAX_RATE =
    overrideTaxRate !== undefined
      ? overrideTaxRate / 100
      : (data.settings.taxRate ?? 30) / 100;

  const untaxedManualEarnings = data.transactions
    .filter((t) => t.type === "earning" && !t.taxed)
    .reduce((sum, t) => sum + t.amount, 0);

  return untaxedManualEarnings * TAX_RATE;
};

export const payTax = async (
  exchangeRate: number,
  liveTaxRate?: number
): Promise<void> => {
  const data = getLifelineData();
  if (!data) return;

  if (!data.taxPayments) {
    data.taxPayments = [];
  }

  const taxAmountLocal = calculateTaxOwed(data, exchangeRate, liveTaxRate);
  if (taxAmountLocal <= 0) return;

  const taxAmountUSD = taxAmountLocal / exchangeRate;

  const earningsIds: string[] = [];

  data.transactions = data.transactions.map((t) => {
    if (t.type === "earning" && !t.taxed) {
      earningsIds.push(t.id);
      return { ...t, taxed: true };
    }
    return t;
  });

  const taxPayment: TaxPayment = {
    id: crypto.randomUUID(),
    amount: taxAmountUSD,
    amountLocal: taxAmountLocal,
    exchangeRate,
    date: new Date().toISOString(),
    earningsIds,
  };

  data.taxPayments.push(taxPayment);

  const taxTransaction: Transaction = {
    id: crypto.randomUUID(),
    amount: taxAmountLocal,
    amountUSD: taxAmountUSD,
    description: `Tax Payment (${liveTaxRate ?? data.settings.taxRate}% Tax)`,
    date: new Date().toISOString(),
    type: "tax",
    exchangeRate,
  };

  data.transactions.push(taxTransaction);
  saveLifelineData(data);
};

export const calculateLifelineStats = (
  data: LifelineData,
  _exchangeRate: number
): LifelineStats => {
  const { settings, transactions } = data;
  const { monthlyExpense, periodMonths, startDate } = settings;

  const totalTarget = monthlyExpense * periodMonths;

  const weeksInPeriod = (periodMonths * 30.44) / 7;
  const weeklyTarget = totalTarget / weeksInPeriod;

  const manualEarnings = transactions
    .filter((t) => t.type === "earning")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEarned = manualEarnings;

  const totalSpent = transactions
    .filter((t) => t.type === "expense" || t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTaxPaid = transactions
    .filter((t) => t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  const untaxedEarnings = transactions
    .filter((t) => t.type === "earning" && !t.taxed)
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = totalEarned - totalSpent;

  const progressPercent =
    totalTarget > 0
      ? Math.min(Math.max((remaining / totalTarget) * 100, 0), 100)
      : 0;

  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysTotal = Math.floor(periodMonths * 30.44);
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  return {
    totalTarget,
    weeklyTarget,
    totalEarned,
    totalSpent,
    totalTaxPaid,
    untaxedEarnings,
    remaining,
    progressPercent,
    daysElapsed,
    daysTotal,
    daysRemaining,
    weeksRemaining,
  };
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

// ---------- Recurring expenses ----------

const addInterval = (iso: string, freq: RecurringFreq): string => {
  const d = new Date(iso);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

export const addRecurringExpense = (
  item: Omit<LifelineRecurringExpense, "id" | "createdAt" | "active" | "nextDueDate"> & {
    nextDueDate?: string;
  }
): LifelineData | null => {
  const data = getLifelineData();
  if (!data) return null;
  if (!data.recurringExpenses) data.recurringExpenses = [];

  const now = new Date().toISOString();
  data.recurringExpenses.push({
    id: uid(),
    amount: item.amount,
    description: item.description,
    frequency: item.frequency,
    nextDueDate: item.nextDueDate || now,
    active: true,
    createdAt: now,
  });
  saveLifelineData(data);
  return data;
};

export const removeRecurringExpense = (id: string): LifelineData | null => {
  const data = getLifelineData();
  if (!data) return null;
  data.recurringExpenses = (data.recurringExpenses || []).filter((r) => r.id !== id);
  saveLifelineData(data);
  return data;
};

export const toggleRecurringExpense = (id: string): LifelineData | null => {
  const data = getLifelineData();
  if (!data) return null;
  data.recurringExpenses = (data.recurringExpenses || []).map((r) =>
    r.id === id ? { ...r, active: !r.active } : r
  );
  saveLifelineData(data);
  return data;
};

/** Generate due recurring lifeline expenses + notifications */
export const processLifelineRecurring = (): number => {
  const data = getLifelineData();
  if (!data) return 0;

  let created = 0;
  const now = Date.now();
  const list = data.recurringExpenses || [];

  data.recurringExpenses = list.map((r) => {
    if (!r.active) return r;
    let cursor = r.nextDueDate;
    let safety = 0;
    while (new Date(cursor).getTime() <= now && safety < 24) {
      const exists = data.transactions.some(
        (t) =>
          t.recurringId === r.id &&
          t.date.slice(0, 10) === cursor.slice(0, 10)
      );
      if (!exists) {
        data.transactions.push({
          id: uid(),
          amount: r.amount,
          description: `[Recurring] ${r.description}`,
          date: cursor,
          type: "expense",
          country: data.settings.country,
          source: "recurring",
          recurringId: r.id,
        });
        addNotification({
          title: `Lifeline recurring: ${r.description}`,
          description: `${formatCurrency(r.amount, data.settings.currency)} due`,
          type: "recurring",
          priority: "medium",
          dueDate: cursor,
          dedupeKey: `ll-rec-${r.id}-${cursor.slice(0, 10)}`,
        });
        created++;
      }
      cursor = addInterval(cursor, r.frequency);
      safety++;
    }
    return { ...r, nextDueDate: cursor };
  });

  saveLifelineData(data);
  return created;
};

// ---------- Family → Lifeline sync (country-aware) ----------

export const syncFamilyExpensesToLifeline = (): number => {
  const data = getLifelineData();
  if (!data) return 0;

  const family = getFamilyData();
  const mainCountry = data.settings.country;
  const existingIds = new Set(
    data.transactions.filter((t) => t.familyExpenseId).map((t) => t.familyExpenseId!)
  );
  // Also check external txs for dedupe
  (data.externalCountryData || []).forEach((ext) => {
    ext.transactions.forEach((t) => {
      if (t.familyExpenseId) existingIds.add(t.familyExpenseId);
    });
  });

  let added = 0;

  const ensureExternal = (country: string) => {
    if (!data.externalCountryData) data.externalCountryData = [];
    let ext = data.externalCountryData.find((e) => e.country === country);
    if (!ext) {
      const currencyMap: Record<string, string> = {
        canada: "CAD",
        usa: "USD",
        pakistan: "PKR",
        uae: "AED",
        ksa: "SAR",
      };
      ext = {
        country,
        currency: currencyMap[country] || "USD",
        transactions: [],
        exchangeRate: 1,
        monthlyBudget:
          data.settings.externalCountryBudgets?.find((b) => b.country === country)
            ?.monthlyBudget || 0,
      };
      data.externalCountryData.push(ext);
      if (!data.settings.externalCountries) data.settings.externalCountries = [];
      if (!data.settings.externalCountries.includes(country)) {
        data.settings.externalCountries.push(country);
      }
    }
    return ext;
  };

  const pushFamilyExpense = (
    expenseId: string,
    amount: number,
    description: string,
    date: string,
    targetCountry: string
  ) => {
    if (!amount || amount <= 0 || existingIds.has(expenseId)) return;

    const isExternal = targetCountry !== mainCountry;

    if (isExternal) {
      const ext = ensureExternal(targetCountry);
      const extTxId = uid();
      const mirrorId = uid();
      ext.transactions.push({
        id: extTxId,
        amount,
        description: `[Family] ${description}`,
        date,
        type: "expense",
        country: targetCountry,
        source: "family",
        familyExpenseId: expenseId,
        linkedTransactionId: mirrorId,
      });
      data.transactions.push({
        id: mirrorId,
        amount,
        description: `[Family/${targetCountry}] ${description}`,
        date,
        type: "expense",
        country: mainCountry,
        isExternalExpense: true,
        source: "family",
        familyExpenseId: `${expenseId}-mirror`,
        linkedTransactionId: extTxId,
      });
    } else {
      data.transactions.push({
        id: uid(),
        amount,
        description: `[Family] ${description}`,
        date,
        type: "expense",
        country: mainCountry,
        source: "family",
        familyExpenseId: expenseId,
      });
    }
    existingIds.add(expenseId);
    added++;
  };

  family.wives.forEach((w) => {
    const country = w.country || mainCountry;
    w.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      pushFamilyExpense(
        e.id,
        e.amount,
        `${w.name}: ${e.description}`,
        e.date,
        e.country || country
      );
    });
    if (w.monthlyAllowance && w.monthlyAllowance > 0) {
      const monthKey = new Date().toISOString().slice(0, 7);
      pushFamilyExpense(
        `allowance-wife-${w.id}-${monthKey}`,
        w.monthlyAllowance,
        `${w.name} monthly allowance`,
        new Date().toISOString(),
        country
      );
    }
  });

  family.children.forEach((c) => {
    const mother = family.wives.find((w) => w.id === c.motherId);
    const country = c.country || mother?.country || mainCountry;
    c.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      pushFamilyExpense(
        e.id,
        e.amount,
        `${c.name}: ${e.description}`,
        e.date,
        e.country || country
      );
    });
    if (c.monthlyFee && c.monthlyFee > 0) {
      const monthKey = new Date().toISOString().slice(0, 7);
      pushFamilyExpense(
        `fee-child-${c.id}-${monthKey}`,
        c.monthlyFee,
        `${c.name} school fee`,
        new Date().toISOString(),
        country
      );
    }
  });

  family.parents.forEach((p) => {
    const country = p.country || "pakistan";
    p.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      pushFamilyExpense(
        e.id,
        e.amount,
        `${p.name}: ${e.description}`,
        e.date,
        e.country || country
      );
    });
    if (p.monthlyAllowance && p.monthlyAllowance > 0) {
      const monthKey = new Date().toISOString().slice(0, 7);
      pushFamilyExpense(
        `allowance-parent-${p.id}-${monthKey}`,
        p.monthlyAllowance,
        `${p.name} monthly allowance`,
        new Date().toISOString(),
        country
      );
    }
  });

  family.siblings.forEach((s) => {
    const country = s.country || "pakistan";
    s.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      pushFamilyExpense(
        e.id,
        e.amount,
        `${s.name}: ${e.description}`,
        e.date,
        e.country || country
      );
    });
    if (s.monthlyAllowance && s.monthlyAllowance > 0) {
      const monthKey = new Date().toISOString().slice(0, 7);
      pushFamilyExpense(
        `allowance-sibling-${s.id}-${monthKey}`,
        s.monthlyAllowance,
        `${s.name} monthly allowance`,
        new Date().toISOString(),
        country
      );
    }
  });

  family.household.forEach((h) => {
    if (h.hidden) return;
    pushFamilyExpense(
      h.id,
      h.amount,
      `Household: ${h.label || h.category}`,
      h.date,
      h.country || mainCountry
    );
  });

  family.events.forEach((ev) => {
    if (ev.hidden) return;
    pushFamilyExpense(
      ev.id,
      ev.amount,
      `Event: ${ev.title}`,
      ev.date,
      ev.country || mainCountry
    );
  });

  (family.subscriptions || [])
    .filter((s) => s.active)
    .forEach((s) => {
      const monthKey = new Date().toISOString().slice(0, 7);
      const monthly =
        s.frequency === "weekly"
          ? s.amount * 4.35
          : s.frequency === "yearly"
            ? s.amount / 12
            : s.amount;
      pushFamilyExpense(
        `sub-${s.id}-${monthKey}`,
        monthly,
        `Subscription: ${s.name}`,
        new Date().toISOString(),
        s.country || mainCountry
      );
    });

  if (added > 0) {
    data.lastFamilySyncAt = new Date().toISOString();
    saveLifelineData(data);
    addNotification({
      title: "Family expenses synced",
      description: `${added} expense(s) routed to country lifelines`,
      type: "reminder",
      priority: "low",
      dedupeKey: `family-sync-${new Date().toISOString().slice(0, 10)}-${added}`,
    });
  }

  return added;
};

// ---------- Backup / device sync (JSON) ----------

export const buildLifelineBackup = (): LifelineBackupPayload => {
  const lifeline = getLifelineData();
  if (!lifeline) {
    throw new Error("No lifeline data to export");
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lifeline,
    family: getFamilyData(),
    notifications: getNotifications(),
    ratesCatalog: getRatesCatalog(),
  };
};

export const downloadLifelineBackup = (): void => {
  const payload = buildLifelineBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pip-pals-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importLifelineBackup = (raw: string): { ok: boolean; message: string } => {
  try {
    const parsed = JSON.parse(raw) as LifelineBackupPayload;
    if (!parsed?.lifeline?.settings?.currency) {
      return { ok: false, message: "Invalid backup file" };
    }
    const lifeline: LifelineData = {
      settings: { autoSyncFamily: true, monthlyIncome: 0, ...parsed.lifeline.settings },
      transactions: Array.isArray(parsed.lifeline.transactions) ? parsed.lifeline.transactions : [],
      taxPayments: Array.isArray(parsed.lifeline.taxPayments) ? parsed.lifeline.taxPayments : [],
      recurringExpenses: Array.isArray(parsed.lifeline.recurringExpenses)
        ? parsed.lifeline.recurringExpenses
        : [],
      externalCountryData: parsed.lifeline.externalCountryData,
      lastExchangeRateUpdate: parsed.lifeline.lastExchangeRateUpdate,
      cachedExchangeRate: parsed.lifeline.cachedExchangeRate,
      lastFamilySyncAt: parsed.lifeline.lastFamilySyncAt,
    };
    saveLifelineData(lifeline);
    if (parsed.family) {
      localStorage.setItem(FAMILY_KEY, JSON.stringify(parsed.family));
    }
    if (parsed.notifications) {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(parsed.notifications));
    }
    if (parsed.ratesCatalog) {
      localStorage.setItem(RATES_KEY, JSON.stringify(parsed.ratesCatalog));
    }
    return { ok: true, message: "Backup restored successfully" };
  } catch {
    return { ok: false, message: "Could not parse backup JSON" };
  }
};

/** Run on Lifeline open: recurring + optional family sync */
export const runLifelineMaintenance = (): { recurring: number; family: number } => {
  const recurring = processLifelineRecurring();
  const data = getLifelineData();
  let family = 0;
  if (data?.settings.autoSyncFamily !== false) {
    family = syncFamilyExpensesToLifeline();
  }
  return { recurring, family };
};
