import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, RefreshCw } from "lucide-react";
import { ExpenseEntry, RateCategory, RecurrenceFreq } from "@/types/family";
import { getRatesCatalog, uid } from "@/utils/family";

interface Props {
  scope: "wife" | "child" | "household";
  currency: string;
  onAdd: (entries: ExpenseEntry[]) => void;
}

export const QuickExpenseAdder = ({ scope, currency, onAdd }: Props) => {
  const catalog = getRatesCatalog().categories.filter(c => c.scope === scope || c.scope === "any");
  const [picked, setPicked] = useState<Record<string, { amount: string; recurring: boolean; freq: RecurrenceFreq }>>({});

  const togglePick = (c: RateCategory) => {
    setPicked(prev => {
      if (prev[c.id]) {
        const { [c.id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [c.id]: {
          amount: String(c.defaultAmount || ""),
          recurring: c.recurring || false,
          freq: c.recurrenceFreq || "monthly",
        },
      };
    });
  };

  const totalSelected = useMemo(
    () => Object.values(picked).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
    [picked]
  );

  const submit = () => {
    const entries: ExpenseEntry[] = Object.entries(picked)
      .map(([id, v]) => {
        const cat = catalog.find(c => c.id === id);
        const amt = parseFloat(v.amount);
        if (!cat || !amt || amt <= 0) return null;
        return {
          id: uid(),
          amount: amt,
          category: cat.name,
          description: cat.name,
          date: new Date().toISOString(),
          paid: false,
          paidAmount: 0,
          recurring: v.recurring,
          recurrenceFreq: v.recurring ? v.freq : undefined,
        } as ExpenseEntry;
      })
      .filter(Boolean) as ExpenseEntry[];
    if (entries.length === 0) return;
    onAdd(entries);
    setPicked({});
  };

  if (catalog.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No rate categories defined. Add some in the Rates tab.
      </p>
    );
  }

  return (
    <div className="space-y-2 border border-primary/20 rounded p-2 bg-primary/5">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Zap className="h-3 w-3" />Quick Add (tick categories)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {catalog.map(c => {
          const sel = picked[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => togglePick(c)}
              className={`text-left text-xs rounded border px-2 py-1.5 transition-all ${
                sel ? "bg-primary/15 border-primary" : "border-border/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-1">
                <span>{c.icon || "💰"}</span>
                <span className="font-medium truncate">{c.name}</span>
                {c.recurring && <RefreshCw className="h-2.5 w-2.5 text-primary" />}
              </div>
              {c.defaultAmount > 0 && (
                <div className="text-[10px] text-muted-foreground">{currency} {c.defaultAmount}</div>
              )}
            </button>
          );
        })}
      </div>

      {Object.keys(picked).length > 0 && (
        <div className="space-y-1.5 border-t pt-2">
          {Object.entries(picked).map(([id, v]) => {
            const c = catalog.find(x => x.id === id)!;
            return (
              <div key={id} className="flex items-center gap-1.5">
                <span className="text-xs flex-1 truncate">{c.icon} {c.name}</span>
                <Input className="h-7 w-24" type="number" value={v.amount}
                  onChange={e => setPicked(p => ({ ...p, [id]: { ...p[id], amount: e.target.value } }))} />
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={v.recurring}
                    onChange={e => setPicked(p => ({ ...p, [id]: { ...p[id], recurring: e.target.checked } }))} />
                  Rec
                </label>
                {v.recurring && (
                  <Select value={v.freq} onValueChange={(val: any) =>
                    setPicked(p => ({ ...p, [id]: { ...p[id], freq: val } }))
                  }>
                    <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className="text-xs">Total: {currency} {totalSelected.toFixed(2)}</Badge>
            <Button size="sm" onClick={submit} className="h-7 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-3 w-3 mr-1" />Add {Object.keys(picked).length}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
