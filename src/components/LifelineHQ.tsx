import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { LayoutDashboard, Globe, Heart, Baby, AlertTriangle } from "lucide-react";
import { LifelineData } from "@/types/lifeline";
import { buildHQDashboard } from "@/utils/hqDashboard";
import { getFamilyData } from "@/utils/family";

const COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const FLAG: Record<string, string> = {
  canada: "🇨🇦",
  uae: "🇦🇪",
  pakistan: "🇵🇰",
  usa: "🇺🇸",
  ksa: "🇸🇦",
};

interface Props {
  lifeline: LifelineData;
  refreshKey?: number;
}

const fmt = (n: number, c: string) => `${c} ${(n || 0).toFixed(0)}`;

export default function LifelineHQ({ lifeline, refreshKey = 0 }: Props) {
  const hq = useMemo(() => {
    void refreshKey;
    return buildHQDashboard(lifeline, getFamilyData());
  }, [lifeline, refreshKey]);

  if (!hq) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Setup Lifeline first to open HQ Dashboard
        </CardContent>
      </Card>
    );
  }

  const bars = hq.countries.map((c) => ({
    name: c.flag,
    full: c.label,
    spend: Math.round(c.totalSpend),
    budget: Math.round(c.budget),
  }));

  const focusCountries = hq.countries.filter(
    (c) =>
      ["canada", "uae", "pakistan"].includes(c.country) ||
      c.totalSpend > 0 ||
      c.budget > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            HQ Command Center
          </h3>
          <p className="text-sm text-muted-foreground">
            {hq.monthLabel} · All countries in {hq.currency} · Sit in Canada, manage everywhere
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Total burn: {fmt(hq.totalBurn, hq.currency)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {focusCountries.map((c) => {
          const pct = c.budget > 0 ? Math.min((c.totalSpend / c.budget) * 100, 100) : 0;
          const over = c.budget > 0 && c.totalSpend > c.budget;
          return (
            <Card key={c.country} className={over ? "border-destructive/40" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {c.flag} {c.label}
                  </span>
                  {over && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
                <p className="text-2xl font-bold">{fmt(c.totalSpend, hq.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  Budget {fmt(c.budget, hq.currency)} · {c.wives} wives · {c.children} kids
                </p>
                {c.budget > 0 && <Progress value={pct} className="h-1.5" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Monthly Spend by Country
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    fmt(v, hq.currency),
                    name === "spend" ? "Spend" : "Budget",
                  ]}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { full?: string })?.full || ""
                  }
                />
                <Legend />
                <Bar dataKey="spend" name="Spend" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="budget" name="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Family Category Split</CardTitle>
          </CardHeader>
          <CardContent>
            {hq.categoryPie.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hq.categoryPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name }) => name}
                    >
                      {hq.categoryPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v, hq.currency)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                Add family expenses to see split
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              Wives this month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hq.byWife.length === 0 && (
              <p className="text-sm text-muted-foreground">No wives yet — add in Family tab</p>
            )}
            {hq.byWife.map((w) => {
              const max = Math.max(...hq.byWife.map((x) => x.spend), 1);
              return (
                <div key={w.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      {w.flag} {w.name}{" "}
                      <span className="text-muted-foreground text-xs">({w.kids} kids)</span>
                    </span>
                    <span className="font-medium">{fmt(w.spend, hq.currency)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-primary"
                      style={{ width: `${(w.spend / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Baby className="h-4 w-4 text-blue-500" />
            Children spend & fees ({hq.byChild.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hq.byChild.length === 0 ? (
            <p className="text-sm text-muted-foreground">No children yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-2">Child</th>
                    <th className="py-2 pr-2">Mother</th>
                    <th className="py-2 pr-2">Country</th>
                    <th className="py-2 pr-2 text-right">Spend</th>
                    <th className="py-2 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {hq.byChild.map((c) => (
                    <tr key={c.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{c.name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{c.mother}</td>
                      <td className="py-2 pr-2">{FLAG[c.country] || c.country}</td>
                      <td className="py-2 pr-2 text-right">{fmt(c.spend, hq.currency)}</td>
                      <td className="py-2 text-right">{fmt(c.fee, hq.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upcoming dues (45 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hq.upcomingDues.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No upcoming dues — add fees / subscriptions
            </p>
          )}
          {hq.upcomingDues.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg border border-border/50"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {d.flag ? `${d.flag} ` : ""}
                  {d.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.date).toLocaleDateString()} · {d.kind}
                </p>
              </div>
              {d.amount != null && d.amount > 0 && (
                <Badge variant="outline">{fmt(d.amount, hq.currency)}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
