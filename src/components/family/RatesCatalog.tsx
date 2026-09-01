import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { RateCategory, RatesCatalog as RatesCatalogType, RecurrenceFreq } from "@/types/family";
import { getRatesCatalog, saveRatesCatalog, uid } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";

interface Props { currency: string }

export const RatesCatalog = ({ currency }: Props) => {
  const [data, setData] = useState<RatesCatalogType>(() => getRatesCatalog());
  const [filter, setFilter] = useState<"all" | RateCategory["scope"]>("all");
  const { toast } = useToast();

  useEffect(() => { saveRatesCatalog(data); }, [data]);

  const update = (id: string, patch: Partial<RateCategory>) =>
    setData({ categories: data.categories.map(c => c.id === id ? { ...c, ...patch } : c) });
  const remove = (id: string) =>
    setData({ categories: data.categories.filter(c => c.id !== id) });

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newScope, setNewScope] = useState<RateCategory["scope"]>("any");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newFreq, setNewFreq] = useState<RecurrenceFreq>("monthly");

  const add = () => {
    if (!newName.trim()) return;
    setData({
      categories: [...data.categories, {
        id: uid(),
        name: newName.trim(),
        defaultAmount: parseFloat(newAmount) || 0,
        scope: newScope,
        recurring: newRecurring,
        recurrenceFreq: newRecurring ? newFreq : undefined,
      }],
    });
    setNewName(""); setNewAmount(""); setNewRecurring(false);
    toast({ title: "Rate added", description: `${newName} saved to catalog` });
  };

  const list = data.categories.filter(c => filter === "all" || c.scope === filter || c.scope === "any");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />Add New Rate / Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder="Category name (e.g. Festival clothes)"
              value={newName} onChange={e => setNewName(e.target.value)} />
            <Input className="col-span-3" type="number" placeholder={`Default (${currency})`}
              value={newAmount} onChange={e => setNewAmount(e.target.value)} />
            <Select value={newScope} onValueChange={(v: any) => setNewScope(v)}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="wife">Wife</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="household">Household</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={add} size="icon" className="col-span-1 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={newRecurring} onChange={e => setNewRecurring(e.target.checked)} />
              Recurring
            </label>
            {newRecurring && (
              <Select value={newFreq} onValueChange={(v: any) => setNewFreq(v)}>
                <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Rates Catalog</CardTitle>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="wife">Wife</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="household">Household</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Set default rates here. Old expenses won't change — only new ones use the latest rate.
          </p>
          {list.map(c => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center border border-border/50 rounded p-2">
              <div className="col-span-1 text-lg text-center">{c.icon || "💰"}</div>
              <Input className="col-span-4 h-8" value={c.name}
                onChange={e => update(c.id, { name: e.target.value })} />
              <Input className="col-span-3 h-8" type="number" value={c.defaultAmount}
                onChange={e => update(c.id, { defaultAmount: parseFloat(e.target.value) || 0 })} />
              <Select value={c.scope} onValueChange={(v: any) => update(c.id, { scope: v })}>
                <SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="wife">Wife</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                </SelectContent>
              </Select>
              <div className="col-span-1 flex items-center gap-1">
                {c.recurring && (
                  <Badge variant="outline" className="text-[9px]">
                    <RefreshCw className="h-2 w-2 mr-0.5" />{c.recurrenceFreq?.[0].toUpperCase()}
                  </Badge>
                )}
              </div>
              <Button size="icon" variant="ghost" className="col-span-1 h-7 w-7 text-red-500"
                onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No rates in this scope.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
