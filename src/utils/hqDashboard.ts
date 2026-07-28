import {
  FamilyData,
  FamilyCountryKey,
  FamilySubscription,
  FAMILY_COUNTRY_OPTIONS,
} from "@/types/family";
import { LifelineData } from "@/types/lifeline";
import { getFamilyData } from "@/utils/family";
import { getLifelineData } from "@/utils/lifeline";

export const COUNTRY_META: Record<
  FamilyCountryKey,
  { label: string; flag: string; short: string }
> = {
  canada: { label: "Canada", flag: "🇨🇦", short: "CA" },
  uae: { label: "Dubai / UAE", flag: "🇦🇪", short: "AE" },
  pakistan: { label: "Pakistan", flag: "🇵🇰", short: "PK" },
  usa: { label: "USA", flag: "🇺🇸", short: "US" },
  ksa: { label: "Saudi Arabia", flag: "🇸🇦", short: "SA" },
};

export interface CountryBurn {
  country: FamilyCountryKey;
  label: string;
  flag: string;
  /** Family-attributed spend (primary currency) */
  familySpend: number;
  /** Lifeline transactions for this country */
  lifelineSpend: number;
  /** Combined unique view: max(family, lifeline) avoided — we sum lifeline + family not yet mirrored carefully; use lifeline as source of truth when synced, else family */
  totalSpend: number;
  wives: number;
  children: number;
  budget: number;
}

export interface HQDashboardData {
  currency: string;
  mainCountry: FamilyCountryKey;
  countries: CountryBurn[];
  totalBurn: number;
  byWife: { id: string; name: string; country: FamilyCountryKey; flag: string; spend: number; kids: number }[];
  byChild: { id: string; name: string; mother: string; country: FamilyCountryKey; spend: number; fee: number }[];
  categoryPie: { name: string; value: number }[];
  upcomingDues: CalendarFeedItem[];
  monthLabel: string;
}

export type CalendarItemKind =
  | "birthday"
  | "fee"
  | "subscription"
  | "event"
  | "loan"
  | "recurring"
  | "allowance";

export interface CalendarFeedItem {
  id: string;
  date: string; // ISO date YYYY-MM-DD or full ISO
  title: string;
  description?: string;
  amount?: number;
  kind: CalendarItemKind;
  country?: FamilyCountryKey;
  flag?: string;
  ownerName?: string;
  priority: "high" | "medium" | "low";
}

const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const toNoonIso = (d: Date) => `${localDateKey(d)}T12:00:00.000Z`;

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const isSameMonth = (iso: string, ym: string) => iso.slice(0, 7) === ym;

export const resolvePersonCountry = (
  country: FamilyCountryKey | undefined,
  fallback: FamilyCountryKey
): FamilyCountryKey => country || fallback;

export const buildHQDashboard = (
  lifeline?: LifelineData | null,
  family?: FamilyData | null
): HQDashboardData | null => {
  const ll = lifeline ?? getLifelineData();
  const fam = family ?? getFamilyData();
  if (!ll) return null;

  const currency = ll.settings.currency;
  const mainCountry = (ll.settings.country || "canada") as FamilyCountryKey;
  const ym = monthKey();

  const countrySet = new Set<FamilyCountryKey>([mainCountry]);
  (ll.settings.externalCountries || []).forEach((c) =>
    countrySet.add(c as FamilyCountryKey)
  );
  fam.wives.forEach((w) => w.country && countrySet.add(w.country));
  fam.children.forEach((c) => c.country && countrySet.add(c.country));
  fam.parents.forEach((p) => p.country && countrySet.add(p.country));
  // Always show Canada / UAE / Pakistan for the user's mental model
  (["canada", "uae", "pakistan"] as FamilyCountryKey[]).forEach((c) =>
    countrySet.add(c)
  );

  const familySpendByCountry: Record<string, number> = {};
  const addFam = (c: FamilyCountryKey, n: number) => {
    familySpendByCountry[c] = (familySpendByCountry[c] || 0) + (n || 0);
  };

  fam.wives.forEach((w) => {
    const c = resolvePersonCountry(w.country, mainCountry);
    w.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      if (isSameMonth(e.date, ym) || !e.date) addFam(resolvePersonCountry(e.country, c), e.amount);
    });
    if (w.monthlyAllowance) addFam(c, w.monthlyAllowance);
  });

  fam.children.forEach((c) => {
    const mother = fam.wives.find((w) => w.id === c.motherId);
    const country = resolvePersonCountry(
      c.country || mother?.country,
      mainCountry
    );
    c.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      if (isSameMonth(e.date, ym)) addFam(resolvePersonCountry(e.country, country), e.amount);
    });
    if (c.monthlyFee) addFam(country, c.monthlyFee);
  });

  fam.parents.forEach((p) => {
    const c = resolvePersonCountry(p.country, "pakistan");
    p.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      if (isSameMonth(e.date, ym)) addFam(c, e.amount);
    });
    if (p.monthlyAllowance) addFam(c, p.monthlyAllowance);
  });

  fam.siblings.forEach((s) => {
    const c = resolvePersonCountry(s.country, "pakistan");
    s.expenses.forEach((e) => {
      if (e.hidden) return;
      if (e.recurring && !e.parentRecurringId) return;
      if (isSameMonth(e.date, ym)) addFam(c, e.amount);
    });
    if (s.monthlyAllowance) addFam(c, s.monthlyAllowance);
  });

  fam.household.forEach((h) => {
    if (h.hidden) return;
    if (isSameMonth(h.date, ym))
      addFam(resolvePersonCountry(h.country, mainCountry), h.amount);
  });

  fam.events.forEach((ev) => {
    if (ev.hidden) return;
    if (isSameMonth(ev.date, ym))
      addFam(resolvePersonCountry(ev.country, mainCountry), ev.amount);
  });

  (fam.subscriptions || [])
    .filter((s) => s.active)
    .forEach((s) => {
      // attribute monthly equivalent
      const monthly =
        s.frequency === "weekly"
          ? s.amount * 4.35
          : s.frequency === "yearly"
            ? s.amount / 12
            : s.amount;
      addFam(resolvePersonCountry(s.country, mainCountry), monthly);
    });

  const lifelineSpendByCountry: Record<string, number> = {};
  const addLl = (c: string, n: number) => {
    lifelineSpendByCountry[c] = (lifelineSpendByCountry[c] || 0) + (n || 0);
  };

  ll.transactions.forEach((t) => {
    if (t.type !== "expense" && t.type !== "tax") return;
    if (!isSameMonth(t.date, ym)) return;
    if (t.isExternalExpense) {
      // attributed via description country elsewhere; skip double count — use external buckets
      return;
    }
    addLl(t.country || mainCountry, t.amount);
  });

  (ll.externalCountryData || []).forEach((ext) => {
    ext.transactions
      .filter((t) => t.type === "expense" && isSameMonth(t.date, ym))
      .forEach((t) => addLl(ext.country, t.amount));
  });

  const budgetFor = (c: FamilyCountryKey) => {
    if (c === mainCountry) return ll.settings.monthlyExpense || 0;
    const b = ll.settings.externalCountryBudgets?.find((x) => x.country === c);
    if (b) return b.monthlyBudget;
    const ext = ll.externalCountryData?.find((x) => x.country === c);
    return ext?.monthlyBudget || 0;
  };

  const countries: CountryBurn[] = Array.from(countrySet).map((country) => {
    const meta = COUNTRY_META[country];
    const familySpend = familySpendByCountry[country] || 0;
    const lifelineSpend = lifelineSpendByCountry[country] || 0;
    // Prefer lifeline when synced (has family-sourced txs), else blend: use max to avoid under-count, but show lifeline as operational
    const totalSpend = Math.max(familySpend, lifelineSpend);
    return {
      country,
      label: meta.label,
      flag: meta.flag,
      familySpend,
      lifelineSpend,
      totalSpend,
      wives: fam.wives.filter((w) => resolvePersonCountry(w.country, mainCountry) === country).length,
      children: fam.children.filter((c) => {
        const mother = fam.wives.find((w) => w.id === c.motherId);
        return (
          resolvePersonCountry(c.country || mother?.country, mainCountry) ===
          country
        );
      }).length,
      budget: budgetFor(country),
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  const byWife = fam.wives.map((w) => {
    const c = resolvePersonCountry(w.country, mainCountry);
    const spend =
      w.expenses
        .filter((e) => !e.hidden && !(e.recurring && !e.parentRecurringId) && isSameMonth(e.date, ym))
        .reduce((s, e) => s + e.amount, 0) + (w.monthlyAllowance || 0);
    return {
      id: w.id,
      name: w.name,
      country: c,
      flag: COUNTRY_META[c].flag,
      spend,
      kids: fam.children.filter((ch) => ch.motherId === w.id).length,
    };
  });

  const byChild = fam.children.map((c) => {
    const mother = fam.wives.find((w) => w.id === c.motherId);
    const country = resolvePersonCountry(c.country || mother?.country, mainCountry);
    const spend = c.expenses
      .filter((e) => !e.hidden && !(e.recurring && !e.parentRecurringId) && isSameMonth(e.date, ym))
      .reduce((s, e) => s + e.amount, 0);
    return {
      id: c.id,
      name: c.name,
      mother: mother?.name || "—",
      country,
      spend,
      fee: c.monthlyFee || 0,
    };
  });

  const categoryPie = [
    { name: "Wives", value: byWife.reduce((s, w) => s + w.spend, 0) },
    {
      name: "Children",
      value: byChild.reduce((s, c) => s + c.spend + c.fee, 0),
    },
    {
      name: "Parents",
      value: fam.parents.reduce(
        (s, p) =>
          s +
          (p.monthlyAllowance || 0) +
          p.expenses
            .filter((e) => !e.hidden && isSameMonth(e.date, ym))
            .reduce((a, e) => a + e.amount, 0),
        0
      ),
    },
    {
      name: "Household",
      value: fam.household
        .filter((h) => !h.hidden && isSameMonth(h.date, ym))
        .reduce((s, h) => s + h.amount, 0),
    },
    {
      name: "Subscriptions",
      value: (fam.subscriptions || [])
        .filter((sub) => sub.active)
        .reduce((s, sub) => {
          const monthly =
            sub.frequency === "weekly"
              ? sub.amount * 4.35
              : sub.frequency === "yearly"
                ? sub.amount / 12
                : sub.amount;
          return s + monthly;
        }, 0),
    },
  ].filter((x) => x.value > 0);

  const upcomingDues = buildCalendarFeed(fam, ll, 45).filter((item) => {
    const t = new Date(item.date).getTime();
    const now = Date.now();
    return t >= now - 86400000 && t <= now + 45 * 86400000;
  });

  return {
    currency,
    mainCountry,
    countries,
    totalBurn: countries.reduce((s, c) => s + c.totalSpend, 0),
    byWife,
    byChild,
    categoryPie,
    upcomingDues: upcomingDues.slice(0, 12),
    monthLabel: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
};

/** Build calendar items for fees, birthdays, subscriptions, events, loans */
export const buildCalendarFeed = (
  family?: FamilyData | null,
  lifeline?: LifelineData | null,
  horizonDays = 90
): CalendarFeedItem[] => {
  const fam = family ?? getFamilyData();
  const ll = lifeline ?? getLifelineData();
  const items: CalendarFeedItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + horizonDays);

  const pushBirthday = (
    name: string,
    dob: string,
    id: string,
    country?: FamilyCountryKey
  ) => {
    const d = new Date(dob);
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    if (next > end) return;
    items.push({
      id: `bday-${id}-${next.getFullYear()}`,
      date: toNoonIso(next),
      title: `🎂 ${name}'s birthday`,
      kind: "birthday",
      country,
      flag: country ? COUNTRY_META[country].flag : undefined,
      ownerName: name,
      priority: "medium",
    });
  };

  fam.children.forEach((c) => {
    const mother = fam.wives.find((w) => w.id === c.motherId);
    const country = resolvePersonCountry(
      c.country || mother?.country,
      (ll?.settings.country as FamilyCountryKey) || "canada"
    );
    if (c.dob) pushBirthday(c.name, c.dob, c.id, country);

    // School fee due day each month in horizon
    if (c.monthlyFee && c.monthlyFee > 0) {
      const dueDay = Math.min(Math.max(c.feeDueDay || 1, 1), 28);
      let cursor = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (cursor < today) cursor.setMonth(cursor.getMonth() + 1);
      while (cursor <= end) {
        items.push({
          id: `fee-${c.id}-${localDateKey(cursor).slice(0, 7)}`,
          date: toNoonIso(cursor),
          title: `School fee: ${c.name}`,
          description: c.schoolName || undefined,
          amount: c.monthlyFee,
          kind: "fee",
          country,
          flag: COUNTRY_META[country].flag,
          ownerName: c.name,
          priority: "high",
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, dueDay);
      }
    }
  });

  fam.wives.forEach((w) => {
    if (w.marriageDate) {
      const d = new Date(w.marriageDate);
      let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      if (next <= end) {
        items.push({
          id: `anniv-${w.id}-${next.getFullYear()}`,
          date: next.toISOString(),
          title: `💍 Anniversary: ${w.name}`,
          kind: "event",
          country: w.country,
          flag: w.country ? COUNTRY_META[w.country].flag : undefined,
          ownerName: w.name,
          priority: "medium",
        });
      }
    }
  });

  (fam.subscriptions || [])
    .filter((s) => s.active)
    .forEach((s) => {
      let cursor = new Date(s.nextDueDate);
      let safety = 0;
      while (cursor <= end && safety < 24) {
        if (cursor >= today) {
          items.push({
            id: `sub-${s.id}-${cursor.toISOString().slice(0, 10)}`,
            date: cursor.toISOString(),
            title: s.name,
            description: s.ownerName || s.category,
            amount: s.amount,
            kind: "subscription",
            country: s.country,
            flag: s.country ? COUNTRY_META[s.country].flag : undefined,
            ownerName: s.ownerName,
            priority: "high",
          });
        }
        if (s.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
        else if (s.frequency === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
        else cursor.setMonth(cursor.getMonth() + 1);
        safety++;
      }
    });

  fam.events.forEach((ev) => {
    if (ev.hidden) return;
    const d = new Date(ev.date);
    if (d >= today && d <= end) {
      items.push({
        id: `ev-${ev.id}`,
        date: ev.date,
        title: ev.title,
        amount: ev.amount,
        kind: "event",
        country: ev.country,
        flag: ev.country ? COUNTRY_META[ev.country].flag : undefined,
        priority: "medium",
      });
    }
  });

  fam.loans
    .filter((l) => l.status === "active" && l.dueDate)
    .forEach((l) => {
      const d = new Date(l.dueDate!);
      if (d >= today && d <= end) {
        items.push({
          id: `loan-${l.id}`,
          date: l.dueDate!,
          title: `Loan: ${l.counterparty}`,
          description: l.type === "borrowed" ? "You owe" : "Owed to you",
          amount: l.amount,
          kind: "loan",
          priority: "high",
        });
      }
    });

  (ll?.recurringExpenses || [])
    .filter((r) => r.active)
    .forEach((r) => {
      let cursor = new Date(r.nextDueDate);
      let safety = 0;
      while (cursor <= end && safety < 12) {
        if (cursor >= today) {
          items.push({
            id: `llrec-${r.id}-${cursor.toISOString().slice(0, 10)}`,
            date: cursor.toISOString(),
            title: r.description,
            amount: r.amount,
            kind: "recurring",
            priority: "medium",
          });
        }
        if (r.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
        else cursor.setMonth(cursor.getMonth() + 1);
        safety++;
      }
    });

  return items.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const countryLabel = (key: FamilyCountryKey) =>
  FAMILY_COUNTRY_OPTIONS.find((c) => c.key === key)?.label || key;

export type { FamilySubscription };
