import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, BedDouble } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { WeeklySleepEntry } from "@/types/mentalHealth";
import { getWeeklySleep, addWeeklySleep, deleteWeeklySleep } from "@/utils/mentalHealth";

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatWeekLabel = (weekStartDate: string): string => {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} - ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
};

export const WeeklySleepTracker = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WeeklySleepEntry[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(() => getMondayOf(new Date()).toISOString().split("T")[0]);
  const [totalHours, setTotalHours] = useState("");
  const [poorNights, setPoorNights] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setEntries(getWeeklySleep());
  }, []);

  const handleSave = () => {
    const hours = parseFloat(totalHours);
    const poor = parseInt(poorNights || "0", 10);

    if (isNaN(hours) || hours < 0) {
      toast({ title: "Invalid hours", description: "Enter a valid total hours value", variant: "destructive" });
      return;
    }
    if (isNaN(poor) || poor < 0 || poor > 7) {
      toast({ title: "Invalid nights", description: "Poor nights must be between 0 and 7", variant: "destructive" });
      return;
    }

    const entry: WeeklySleepEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(weekStartDate).getTime(),
      weekStartDate,
      weekLabel: formatWeekLabel(weekStartDate),
      totalHours: hours,
      poorNights: poor,
      notes: notes.trim() || undefined,
    };

    addWeeklySleep(entry);
    setEntries(getWeeklySleep());
    setTotalHours("");
    setPoorNights("");
    setNotes("");
    toast({ title: "Saved", description: `Sleep data saved for ${entry.weekLabel}` });
  };

  const handleDelete = (id: string) => {
    deleteWeeklySleep(id);
    setEntries(getWeeklySleep());
    toast({ title: "Deleted", description: "Weekly sleep entry removed" });
  };

  const chartData = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-8)
        .map((e) => ({ week: e.weekLabel.split(" - ")[0], hours: e.totalHours, avgPerNight: parseFloat((e.totalHours / 7).toFixed(1)) })),
    [entries]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            Weekly Sleep Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Week start (Monday)</label>
              <Input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total hours slept this week</label>
              <Input type="number" min="0" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nights with poor sleep (0-7)</label>
              <Input type="number" min="0" max="7" value={poorNights} onChange={(e) => setPoorNights(e.target.value)} placeholder="e.g. 2" />
            </div>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
          <Button onClick={handleSave} className="w-full sm:w-auto">Save Week</Button>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekly Sleep Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number, name) => [value, name === "hours" ? "Total hours" : "Avg/night"]} />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No weekly entries saved yet</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {entries.map((e) => (
                <div key={e.id} className="rounded-md border p-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{e.weekLabel}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.totalHours}h total · {(e.totalHours / 7).toFixed(1)}h/night avg · {e.poorNights} disturbed nights
                    </div>
                    {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklySleepTracker;
