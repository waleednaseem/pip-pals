import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { buildCalendarFeed, CalendarFeedItem } from "@/utils/hqDashboard";
import { getFamilyData } from "@/utils/family";
import { getLifelineData } from "@/utils/lifeline";

interface Props {
  currency: string;
  refreshKey?: number;
}

const kindColor: Record<string, string> = {
  birthday: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  fee: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  subscription: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  event: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  loan: "bg-red-500/15 text-red-600 border-red-500/30",
  recurring: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  allowance: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
};

export default function FamilyCalendarView({ currency, refreshKey = 0 }: Props) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const feed = useMemo(() => {
    void refreshKey;
    return buildCalendarFeed(getFamilyData(), getLifelineData(), 120);
  }, [refreshKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    feed.forEach((item) => {
      const key = item.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [feed]);

  const selectedKey = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`
    : "";
  const dayItems = byDay.get(selectedKey) || [];

  const modifiers = useMemo(() => {
    const dates: Date[] = [];
    byDay.forEach((_, key) => {
      const [y, m, d] = key.split("-").map(Number);
      dates.push(new Date(y, m - 1, d));
    });
    return { hasEvents: dates };
  }, [byDay]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Family Calendar
        </h3>
        <p className="text-sm text-muted-foreground">
          Fees, birthdays, subscriptions, loans & recurring — next 4 months
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              modifiers={modifiers}
              modifiersClassNames={{
                hasEvents: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selected
                ? selected.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
            {dayItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No events on this day
              </p>
            )}
            {dayItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${kindColor[item.kind] || "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {item.flag ? `${item.flag} ` : ""}
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs opacity-80">{item.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.kind}
                    </Badge>
                    {item.amount != null && item.amount > 0 && (
                      <p className="text-xs font-semibold mt-1">
                        {currency} {item.amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Agenda (next 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {feed
            .filter((i) => {
              const t = new Date(i.date).getTime();
              const now = Date.now();
              return t >= now - 86400000 && t <= now + 30 * 86400000;
            })
            .slice(0, 20)
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm py-2 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {item.flag ? `${item.flag} ` : ""}
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString()} · {item.kind}
                  </p>
                </div>
                {item.amount != null && item.amount > 0 && (
                  <span className="text-xs font-medium shrink-0">
                    {currency} {item.amount.toFixed(0)}
                  </span>
                )}
              </div>
            ))}
          {feed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Calendar empty — add kids DOB, fees, subscriptions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
