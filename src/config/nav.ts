import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Brain,
  Calculator,
  CandlestickChart,
  Clock,
  Columns3,
  Files,
  HeartPulse,
  Landmark,
  Lightbulb,
  Megaphone,
  Newspaper,
  Receipt,
  Scale,
  Sigma,
  Split,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  requiresPair?: boolean;
  /** Only shown to the app owner account. */
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "trading",
    label: "Trading",
    items: [
      { value: "pair", label: "Select Pair", icon: CandlestickChart, adminOnly: true },
      { value: "calculator", label: "Pip Calculator", icon: Calculator, requiresPair: true, adminOnly: true },
      { value: "totals", label: "Totals", icon: BarChart3, requiresPair: true, adminOnly: true },
      { value: "lotfit", label: "LotFit", icon: Scale, adminOnly: true },
      { value: "ftmo", label: "FTMO Challenge", icon: Target, adminOnly: true },
      { value: "dynamic-calc", label: "Dynamic Calculator", icon: Sigma, adminOnly: true },
      { value: "trading-signals", label: "Signals", icon: TrendingUp },
      { value: "market-updates", label: "Market Updates", icon: Newspaper },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { value: "canada", label: "Financial Plan", icon: Landmark },
      { value: "salary", label: "Expense Calculator", icon: Wallet },
      { value: "converter", label: "Currency Converter", icon: ArrowLeftRight },
      { value: "lifeline", label: "Lifeline", icon: HeartPulse },
      { value: "tax", label: "Tax History", icon: Receipt },
      { value: "group-expenses", label: "Group Expenses", icon: Users },
      { value: "expense-divider", label: "Expense Divider", icon: Split },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      { value: "kanban", label: "Kanban Board", icon: Columns3 },
      { value: "business-ideas", label: "Business Ideas", icon: Lightbulb },
      { value: "advertising", label: "Advertising", icon: Megaphone, adminOnly: true },
    ],
  },
  {
    id: "wellness",
    label: "Wellness",
    items: [{ value: "mental-health", label: "Mental Health", icon: Brain }],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { value: "studio", label: "File Studio", icon: Files },
      { value: "time-convert", label: "Time Conversion", icon: Clock },
    ],
  },
];

export const getVisibleNavGroups = (
  hasPair: boolean,
  opts?: { isOwner?: boolean }
): NavGroup[] =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.requiresPair && !hasPair) return false;
      if (item.adminOnly && !opts?.isOwner) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

export const getTabLabel = (value: string): string => {
  if (value === "notifications") return "Notifications";
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => entry.value === value);
    if (item) return item.label;
  }
  return "Dashboard";
};
