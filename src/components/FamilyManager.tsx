import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Baby, Heart, UserPlus, Home, CalendarDays, Wallet, Sparkles,
  Plus, Trash2, Check, X, AlertCircle, PieChart as PieIcon, ArrowDownCircle, ArrowUpCircle,
  Tag, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { PieChart as RPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  FamilyData, Wife, Child, Parent, Sibling, HouseholdExpense, FamilyEvent,
  Loan, ZakatRecord, ExpenseEntry, FamilyCountryKey, FAMILY_COUNTRY_OPTIONS,
} from "@/types/family";
import { getFamilyData, saveFamilyData, sumExpenses, wifeTotal, loanOutstanding, calcZakat, uid, addNotification } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";
import { RatesCatalog } from "@/components/family/RatesCatalog";
import { QuickExpenseAdder } from "@/components/family/QuickExpenseAdder";

const CHART_COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

interface Props {
  currency: string;
}

const fmt = (n: number, c: string) => `${c} ${(n || 0).toFixed(2)}`;

export const FamilyManager = ({ currency }: Props) => {
  const [data, setData] = useState<FamilyData>(() => getFamilyData());
  const { toast } = useToast();

  useEffect(() => {
    saveFamilyData(data);
  }, [data]);

  const update = (patch: Partial<FamilyData>) => setData(d => ({ ...d, ...patch }));

  // ============= Aggregated dashboard =============
  const totals = useMemo(() => {
    const wives = data.wives.reduce((s, w) => s + sumExpenses(w.expenses) + (w.monthlyAllowance || 0), 0);
    const children = data.children.reduce((s, c) => s + sumExpenses(c.expenses) + (c.monthlyFee || 0), 0);
    const parents = data.parents.reduce((s, p) => s + sumExpenses(p.expenses) + (p.monthlyAllowance || 0), 0);
    const siblings = data.siblings.reduce((s, sb) => s + sumExpenses(sb.expenses) + (sb.monthlyAllowance || 0), 0);
    const household = data.household.filter((h) => !h.hidden).reduce((s, h) => s + h.amount, 0);
    const events = data.events.filter((e) => !e.hidden).reduce((s, e) => s + e.amount, 0);
    const loanOwe = data.loans.filter(l => l.type === "borrowed" && l.status === "active").reduce((s, l) => s + loanOutstanding(l), 0);
    const loanLent = data.loans.filter(l => l.type === "lent" && l.status === "active").reduce((s, l) => s + loanOutstanding(l), 0);
    const zakatDue = data.zakat.filter(z => !z.paid).reduce((s, z) => s + z.zakatDue, 0);
    return { wives, children, parents, siblings, household, events, loanOwe, loanLent, zakatDue };
  }, [data]);

  const pieData = [
    { name: "Wives", value: totals.wives },
    { name: "Children", value: totals.children },
    { name: "Parents", value: totals.parents },
    { name: "Siblings", value: totals.siblings },
    { name: "Household", value: totals.household },
    { name: "Events", value: totals.events },
  ].filter(d => d.value > 0);

  const grandTotal = totals.wives + totals.children + totals.parents + totals.siblings + totals.household + totals.events;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="flex-1 min-w-[110px] gap-1"><PieIcon className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="wives" className="flex-1 min-w-[110px] gap-1"><Heart className="h-4 w-4" />Wives & Kids</TabsTrigger>
          <TabsTrigger value="rates" className="flex-1 min-w-[110px] gap-1"><Tag className="h-4 w-4" />Rates</TabsTrigger>
          <TabsTrigger value="parents" className="flex-1 min-w-[110px] gap-1"><Users className="h-4 w-4" />Parents</TabsTrigger>
          <TabsTrigger value="siblings" className="flex-1 min-w-[110px] gap-1"><UserPlus className="h-4 w-4" />Siblings</TabsTrigger>
          <TabsTrigger value="household" className="flex-1 min-w-[110px] gap-1"><Home className="h-4 w-4" />Household</TabsTrigger>
          <TabsTrigger value="events" className="flex-1 min-w-[110px] gap-1"><CalendarDays className="h-4 w-4" />Events</TabsTrigger>
          <TabsTrigger value="loans" className="flex-1 min-w-[110px] gap-1"><Wallet className="h-4 w-4" />Loans</TabsTrigger>
          <TabsTrigger value="zakat" className="flex-1 min-w-[110px] gap-1"><Sparkles className="h-4 w-4" />Zakat</TabsTrigger>
        </TabsList>

        {/* ========== DASHBOARD ========== */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile label="Total Family Spend" value={fmt(grandTotal, currency)} accent="text-primary" />
            <SummaryTile label="I Owe" value={fmt(totals.loanOwe, currency)} accent="text-red-500" />
            <SummaryTile label="Owed To Me" value={fmt(totals.loanLent, currency)} accent="text-emerald-500" />
            <SummaryTile label="Zakat Pending" value={fmt(totals.zakatDue, currency)} accent="text-amber-500" />
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieIcon className="h-4 w-4 text-primary" />Family Expense Breakdown</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPie>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, value }) => `${name}: ${fmt(value, currency)}`}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v, currency)} />
                      <Legend />
                    </RPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No family expenses recorded yet. Add wives, children, parents, or household expenses to see the breakdown.</p>
              )}
            </CardContent>
          </Card>

          {data.wives.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Per-Wife Comparison (Adl Indicator)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.wives.map(w => {
                  const t = wifeTotal(data, w.id);
                  const max = Math.max(...data.wives.map(x => wifeTotal(data, x.id)), 1);
                  const pct = (t / max) * 100;
                  return (
                    <div key={w.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{w.name}</span>
                        <span className="text-muted-foreground">{fmt(t, currency)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-2">Try to keep spending balanced across wives for fairness (adl).</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== WIVES & CHILDREN ========== */}
        <TabsContent value="wives" className="mt-4 space-y-4">
          <WivesSection data={data} setData={setData} currency={currency} toast={toast} />
        </TabsContent>

        {/* ========== RATES CATALOG ========== */}
        <TabsContent value="rates" className="mt-4 space-y-4">
          <RatesCatalog currency={currency} />
        </TabsContent>

        {/* ========== PARENTS ========== */}
        <TabsContent value="parents" className="mt-4 space-y-4">
          <ParentsSection data={data} setData={setData} currency={currency} />
        </TabsContent>

        {/* ========== SIBLINGS ========== */}
        <TabsContent value="siblings" className="mt-4 space-y-4">
          <SiblingsSection data={data} setData={setData} currency={currency} />
        </TabsContent>

        {/* ========== HOUSEHOLD ========== */}
        <TabsContent value="household" className="mt-4 space-y-4">
          <HouseholdSection data={data} setData={setData} currency={currency} />
        </TabsContent>

        {/* ========== EVENTS ========== */}
        <TabsContent value="events" className="mt-4 space-y-4">
          <EventsSection data={data} setData={setData} currency={currency} />
        </TabsContent>

        {/* ========== LOANS ========== */}
        <TabsContent value="loans" className="mt-4 space-y-4">
          <LoansSection data={data} setData={setData} currency={currency} />
        </TabsContent>

        {/* ========== ZAKAT ========== */}
        <TabsContent value="zakat" className="mt-4 space-y-4">
          <ZakatSection data={data} setData={setData} currency={currency} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================ SHARED SUB-COMPONENTS ============================

const SummaryTile = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <Card><CardContent className="p-3">
    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className={`text-base font-bold mt-1 ${accent || ""}`}>{value}</div>
  </CardContent></Card>
);

interface ExpenseListProps {
  entries: ExpenseEntry[];
  currency: string;
  onChange: (next: ExpenseEntry[]) => void;
  categories?: string[];
  compact?: boolean;
}

const ExpenseListEditor = ({ entries, currency, onChange, categories, compact }: ExpenseListProps) => {
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(categories?.[0] || "general");
  const [partialFor, setPartialFor] = useState<string | null>(null);
  const [partialAmt, setPartialAmt] = useState("");

  const add = () => {
    const a = parseFloat(amt);
    if (!a || a <= 0) return;
    onChange([
      ...entries,
      { id: uid(), amount: a, category: cat, description: desc || cat, date: new Date().toISOString(), paid: false, paidAmount: 0 },
    ]);
    setAmt(""); setDesc("");
  };

  const togglePaid = (id: string) =>
    onChange(entries.map(e => e.id === id
      ? { ...e, paid: !e.paid, paidAmount: !e.paid ? e.amount : 0 }
      : e));

  const toggleHidden = (id: string) =>
    onChange(entries.map(e => e.id === id ? { ...e, hidden: !e.hidden } : e));

  const setPartial = (id: string) => {
    const a = parseFloat(partialAmt);
    if (isNaN(a) || a < 0) return;
    onChange(entries.map(e => e.id === id
      ? { ...e, paidAmount: Math.min(a, e.amount), paid: a >= e.amount }
      : e));
    setPartialFor(null); setPartialAmt("");
  };

  const remove = (id: string) => onChange(entries.filter(e => e.id !== id));

  const total = sumExpenses(entries);
  const paidTotal = entries.reduce((s, e) => {
    if (e.hidden) return s;
    if (e.paid) return s + e.amount;
    return s + (e.paidAmount || 0);
  }, 0);

  const statusOf = (e: ExpenseEntry): "paid" | "partial" | "due" => {
    if (e.paid || (e.paidAmount && e.paidAmount >= e.amount)) return "paid";
    if (e.paidAmount && e.paidAmount > 0) return "partial";
    return "due";
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2">
        {categories && categories.length > 0 && (
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Input className={categories ? "col-span-4" : "col-span-6"} placeholder="Description"
          value={desc} onChange={e => setDesc(e.target.value)} />
        <Input className={categories ? "col-span-3" : "col-span-4"} type="number" inputMode="decimal"
          placeholder={`Amount (${currency})`} value={amt} onChange={e => setAmt(e.target.value)} />
        <Button onClick={add} size="icon" className="col-span-1 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {entries.slice().reverse().map(e => {
            const st = statusOf(e);
            const remain = e.amount - (e.paidAmount || (e.paid ? e.amount : 0));
            return (
              <div key={e.id} className={`rounded border ${
                e.hidden ? "opacity-40 grayscale border-dashed border-border/30"
                  : st === "paid" ? "bg-emerald-500/5 border-emerald-500/30"
                  : st === "partial" ? "bg-amber-500/5 border-amber-500/30"
                  : "border-border/50"
              }`}>
                <div
                  onClick={(ev) => { if ((ev.target as HTMLElement).closest("button,input") ) return; togglePaid(e.id); }}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/40">
                  <Button size="icon" variant="ghost" onClick={() => toggleHidden(e.id)} className="h-6 w-6 text-muted-foreground shrink-0" title={e.hidden ? "Show in calculations" : "Hide from calculations"}>
                    {e.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium break-words ${st === "paid" ? "line-through opacity-70" : ""}`}>{e.description}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.category} · {new Date(e.date).toLocaleDateString()}
                      {e.recurring && <> · <RefreshCw className="inline h-2.5 w-2.5" /> {e.recurrenceFreq}</>}
                      {e.parentRecurringId && " · auto"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${st === "paid" ? "text-emerald-500" : st === "partial" ? "text-amber-500" : ""}`}>
                      {fmt(e.amount, currency)}
                    </div>
                    {st === "partial" && (
                      <div className="text-[9px] text-amber-600">
                        Paid {fmt(e.paidAmount || 0, currency)} · Due {fmt(remain, currency)}
                      </div>
                    )}
                  </div>
                  <Badge variant={st === "paid" ? "default" : "outline"} className={`text-[9px] ${
                    st === "partial" ? "border-amber-500 text-amber-600" : ""
                  }`}>
                    {st === "paid" ? "PAID" : st === "partial" ? "PARTIAL" : "DUE"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setPartialFor(e.id); setPartialAmt(String(e.paidAmount || "")); }}
                    className="h-7 w-7 text-amber-500" title="Partial payment"><Wallet className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button>
                </div>
                {partialFor === e.id && (
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Input type="number" placeholder={`Paid amount (max ${e.amount})`}
                      value={partialAmt} onChange={ev => setPartialAmt(ev.target.value)} className="h-7 text-xs" />
                    <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-700" onClick={() => setPartial(e.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setPartialFor(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
        <span>Total: <strong className="text-foreground">{fmt(total, currency)}</strong></span>
        <span>Paid: <strong className="text-emerald-500">{fmt(paidTotal, currency)}</strong></span>
        <span>Due: <strong className="text-amber-500">{fmt(total - paidTotal, currency)}</strong></span>
      </div>
    </div>
  );
};

// ============================ WIVES SECTION ============================

const WivesSection = ({ data, setData, currency, toast }: any) => {
  const [name, setName] = useState("");

  const addWife = () => {
    if (!name.trim()) return;
    const w: Wife = { id: uid(), name: name.trim(), expenses: [], walletBalance: 0, mahrPaid: 0, country: "uae" };
    setData({ ...data, wives: [...data.wives, w] });
    setName("");
    toast({ title: "Wife added", description: `${w.name} added to family.` });
  };

  const updateWife = (id: string, patch: Partial<Wife>) =>
    setData({ ...data, wives: data.wives.map((w: Wife) => w.id === id ? { ...w, ...patch } : w) });

  const removeWife = (id: string) =>
    setData({
      ...data,
      wives: data.wives.filter((w: Wife) => w.id !== id),
      children: data.children.filter((c: Child) => c.motherId !== id),
    });

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Add Wife</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Wife's name" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addWife()} />
            <Button onClick={addWife} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      {data.wives.map((w: Wife) => (
        <WifeCard key={w.id} wife={w} data={data} setData={setData} currency={currency}
          onUpdate={(patch) => updateWife(w.id, patch)} onRemove={() => removeWife(w.id)} />
      ))}

      {data.wives.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No wives added yet.</p>
      )}
    </>
  );
};

const WifeCard = ({ wife, data, setData, currency, onUpdate, onRemove }: any) => {
  const myKids = data.children.filter((c: Child) => c.motherId === wife.id);
  const total = wifeTotal(data, wife.id);
  const [childName, setChildName] = useState("");

  const addChild = () => {
    if (!childName.trim()) return;
    const c: Child = { id: uid(), motherId: wife.id, name: childName.trim(), expenses: [] };
    setData({ ...data, children: [...data.children, c] });
    setChildName("");
  };
  const updateChild = (id: string, patch: Partial<Child>) =>
    setData({ ...data, children: data.children.map((c: Child) => c.id === id ? { ...c, ...patch } : c) });
  const removeChild = (id: string) =>
    setData({ ...data, children: data.children.filter((c: Child) => c.id !== id) });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            <Input value={wife.name} onChange={e => onUpdate({ name: e.target.value })} className="h-8 max-w-[200px] font-semibold" />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Total: {fmt(total, currency)}</Badge>
            {wife.country && (
              <Badge variant="secondary" className="text-xs">
                {FAMILY_COUNTRY_OPTIONS.find((c) => c.key === wife.country)?.flag}{" "}
                {FAMILY_COUNTRY_OPTIONS.find((c) => c.key === wife.country)?.label}
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={onRemove} className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Lives in (Country)</Label>
            <Select
              value={wife.country || ""}
              onValueChange={(v: FamilyCountryKey) => onUpdate({ country: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Assign country" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.flag} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Marriage Date</Label>
            <Input type="date" value={wife.marriageDate || ""} onChange={e => onUpdate({ marriageDate: e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Mahr Total</Label>
            <Input type="number" value={wife.mahrTotal ?? ""} onChange={e => onUpdate({ mahrTotal: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
          <div><Label className="text-xs">Mahr Paid</Label>
            <Input type="number" value={wife.mahrPaid ?? ""} onChange={e => onUpdate({ mahrPaid: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
          <div><Label className="text-xs">Monthly Allowance</Label>
            <Input type="number" value={wife.monthlyAllowance ?? ""} onChange={e => onUpdate({ monthlyAllowance: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
          <div><Label className="text-xs">Wallet Balance</Label>
            <Input type="number" value={wife.walletBalance ?? ""} onChange={e => onUpdate({ walletBalance: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
        </div>
        {wife.mahrTotal && wife.mahrTotal > (wife.mahrPaid || 0) && (
          <div className="flex items-center gap-2 text-xs text-amber-500"><AlertCircle className="h-3 w-3" />Mahr pending: {fmt(wife.mahrTotal - (wife.mahrPaid || 0), currency)}</div>
        )}
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={wife.notes || ""} onChange={e => onUpdate({ notes: e.target.value })} placeholder="Personal notes..." />
        </div>

        {/* Wife expenses */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Wife's Expenses</Label>
          <QuickExpenseAdder
            scope="wife"
            currency={currency}
            onAdd={(entries) => onUpdate({ expenses: [...wife.expenses, ...entries] })}
          />
          <ExpenseListEditor
            entries={wife.expenses}
            currency={currency}
            onChange={(ne) => onUpdate({ expenses: ne })}
            categories={["clothing", "jewellery", "medical", "gifts", "personal", "beauty", "other"]}
          />
        </div>

        {/* Children */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold flex items-center gap-1"><Baby className="h-4 w-4" />Children ({myKids.length})</Label>
          </div>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Child's name" value={childName} onChange={e => setChildName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addChild()} className="h-8" />
            <Button size="sm" onClick={addChild} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-3 w-3 mr-1" />Add Child</Button>
          </div>
          <div className="space-y-3">
            {myKids.map((c: Child) => (
              <ChildBlock key={c.id} child={c} currency={currency}
                onUpdate={(p) => updateChild(c.id, p)} onRemove={() => removeChild(c.id)} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const computeAge = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return age;
};

const ChildBlock = ({ child, currency, onUpdate, onRemove }: any) => {
  const total = sumExpenses(child.expenses) + (child.monthlyFee || 0);
  const age = computeAge(child.dob);
  return (
    <div className="border border-border/50 rounded p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <Input value={child.name} onChange={e => onUpdate({ name: e.target.value })} className="h-7 font-semibold max-w-[160px]" />
        {age !== null && <Badge variant="outline" className="text-[10px]">Age: {age}</Badge>}
        <Badge variant="outline" className="text-[10px]">{fmt(total, currency)}</Badge>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-red-500"><Trash2 className="h-3 w-3" /></Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div><Label className="text-[10px]">DOB</Label><Input type="date" value={child.dob || ""} onChange={e => onUpdate({ dob: e.target.value })} className="h-7 text-xs" /></div>
        <div><Label className="text-[10px]">Gender</Label>
          <Select value={child.gender || ""} onValueChange={(v: any) => onUpdate({ gender: v })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Country</Label>
          <Select
            value={child.country || ""}
            onValueChange={(v: FamilyCountryKey) => onUpdate({ country: v })}
          >
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Inherit mom" /></SelectTrigger>
            <SelectContent>
              {FAMILY_COUNTRY_OPTIONS.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.flag} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-[10px]">School</Label><Input value={child.schoolName || ""} onChange={e => onUpdate({ schoolName: e.target.value })} className="h-7 text-xs" /></div>
        <div><Label className="text-[10px]">Class</Label><Input value={child.schoolClass || ""} onChange={e => onUpdate({ schoolClass: e.target.value })} className="h-7 text-xs" /></div>
        <div><Label className="text-[10px]">Monthly Fee</Label><Input type="number" value={child.monthlyFee ?? ""} onChange={e => onUpdate({ monthlyFee: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" /></div>
        <div><Label className="text-[10px]">Fee due day (1–28)</Label><Input type="number" min={1} max={28} value={child.feeDueDay ?? ""} onChange={e => onUpdate({ feeDueDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)) })} className="h-7 text-xs" /></div>
      </div>
      <QuickExpenseAdder
        scope="child"
        currency={currency}
        onAdd={(entries) => onUpdate({ expenses: [...child.expenses, ...entries] })}
      />
      <ExpenseListEditor
        entries={child.expenses}
        currency={currency}
        onChange={(ne) => onUpdate({ expenses: ne })}
        categories={["fees", "uniform", "books", "stationery", "tuition", "medical", "clothing", "toys", "events", "other"]}
      />
    </div>
  );
};

// ============================ PARENTS / SIBLINGS (shared pattern) ============================

const PersonSection = ({ data, setData, currency, kind }: any) => {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState(kind === "parents" ? "father" : "brother");
  const list: (Parent | Sibling)[] = data[kind];

  const add = () => {
    if (!name.trim()) return;
    const item: any = {
      id: uid(),
      name: name.trim(),
      relation,
      expenses: [],
      country: kind === "parents" || kind === "siblings" ? "pakistan" : undefined,
    };
    setData({ ...data, [kind]: [...list, item] });
    setName("");
  };
  const update = (id: string, patch: any) =>
    setData({ ...data, [kind]: list.map(p => p.id === id ? { ...p, ...patch } : p) });
  const remove = (id: string) =>
    setData({ ...data, [kind]: list.filter(p => p.id !== id) });

  const relOptions = kind === "parents" ? ["father", "mother"] : ["brother", "sister"];

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base capitalize">Add {kind === "parents" ? "Parent" : "Sibling"}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[120px]" />
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{relOptions.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={add} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      {list.map((p: any) => {
        const total = sumExpenses(p.expenses) + (p.monthlyAllowance || 0);
        return (
          <Card key={p.id} className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Input value={p.name} onChange={e => update(p.id, { name: e.target.value })} className="h-8 font-semibold max-w-[200px]" />
                  <Badge variant="outline" className="capitalize text-xs">{p.relation}</Badge>
                </div>
                <Badge variant="outline" className="text-xs">{fmt(total, currency)}</Badge>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Country</Label>
                  <Select
                    value={p.country || "pakistan"}
                    onValueChange={(v: FamilyCountryKey) => update(p.id, { country: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FAMILY_COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.flag} {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Monthly Allowance</Label>
                  <Input type="number" value={p.monthlyAllowance ?? ""} onChange={e => update(p.id, { monthlyAllowance: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
                <div className="col-span-2"><Label className="text-xs">Notes</Label>
                  <Input value={p.notes || ""} onChange={e => update(p.id, { notes: e.target.value })} className="h-8" /></div>
              </div>
              <ExpenseListEditor entries={p.expenses} currency={currency} onChange={ne => update(p.id, { expenses: ne })}
                categories={kind === "parents"
                  ? ["medical", "allowance", "hajj-umrah", "gifts", "groceries", "other"]
                  : ["support", "wedding", "education", "medical", "gifts", "other"]} />
            </CardContent>
          </Card>
        );
      })}

      {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">None added yet.</p>}
    </>
  );
};

const ParentsSection = (props: any) => <PersonSection {...props} kind="parents" />;
const SiblingsSection = (props: any) => <PersonSection {...props} kind="siblings" />;

// ============================ HOUSEHOLD ============================

const HouseholdSection = ({ data, setData, currency }: any) => {
  const [amt, setAmt] = useState("");
  const [label, setLabel] = useState("");
  const [cat, setCat] = useState<HouseholdExpense["category"]>("grocery");
  const [recurring, setRecurring] = useState(false);
  const [country, setCountry] = useState<FamilyCountryKey>("canada");

  const add = () => {
    const a = parseFloat(amt);
    if (!a || a <= 0 || !label.trim()) return;
    const h: HouseholdExpense = {
      id: uid(),
      category: cat,
      label: label.trim(),
      amount: a,
      date: new Date().toISOString(),
      recurring,
      paid: false,
      country,
    };
    setData({ ...data, household: [...data.household, h] });
    setAmt(""); setLabel("");
  };
  const togglePaid = (id: string) => setData({ ...data, household: data.household.map((h: HouseholdExpense) => h.id === id ? { ...h, paid: !h.paid } : h) });
  const toggleHidden = (id: string) => setData({ ...data, household: data.household.map((h: HouseholdExpense) => h.id === id ? { ...h, hidden: !h.hidden } : h) });
  const remove = (id: string) => setData({ ...data, household: data.household.filter((h: HouseholdExpense) => h.id !== id) });

  const cats: HouseholdExpense["category"][] = ["grocery", "utilities", "rent", "staff", "maintenance", "vehicle", "other"];
  const total = data.household.reduce((s: number, h: HouseholdExpense) => s + (h.hidden ? 0 : h.amount), 0);
  const paid = data.household.filter((h: HouseholdExpense) => h.paid && !h.hidden).reduce((s: number, h: HouseholdExpense) => s + h.amount, 0);

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4 text-primary" />Add Household Expense</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <Select value={cat} onValueChange={(v: any) => setCat(v)}>
              <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
              <SelectContent>{cats.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="col-span-5" placeholder="Label (e.g. Bijli bill)" value={label} onChange={e => setLabel(e.target.value)} />
            <Input className="col-span-3" type="number" placeholder={`Amount (${currency})`} value={amt} onChange={e => setAmt(e.target.value)} />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />Recurring monthly</label>
              <Select value={country} onValueChange={(v: FamilyCountryKey) => setCountry(v)}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAMILY_COUNTRY_OPTIONS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.flag} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Household Items</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {data.household.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No household expenses yet.</p>}
          {data.household.slice().reverse().map((h: HouseholdExpense) => (
            <div key={h.id}
              onClick={(ev) => { if ((ev.target as HTMLElement).closest("button")) return; togglePaid(h.id); }}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/40 ${h.hidden ? "opacity-40 grayscale border-dashed border-border/30" : h.paid ? "bg-emerald-500/5 border-emerald-500/30" : "border-border/50"}`}>
              <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); toggleHidden(h.id); }} className="h-6 w-6 text-muted-foreground shrink-0" title={h.hidden ? "Show in calculations" : "Hide from calculations"}>
                {h.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Badge variant="outline" className="text-[9px] capitalize">{h.category}</Badge>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium break-words ${h.paid ? "line-through opacity-70" : ""}`}>{h.label}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString()}{h.recurring && " · monthly"}</div>
              </div>
              <div className={`text-sm font-semibold ${h.paid ? "text-emerald-500" : ""}`}>{fmt(h.amount, currency)}</div>
              <Badge variant={h.paid ? "default" : "outline"} className="text-[9px]">{h.paid ? "PAID" : "DUE"}</Badge>
              <Button size="icon" variant="ghost" onClick={() => remove(h.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <div className="flex justify-between text-xs pt-2 border-t">
            <span>Total: <strong>{fmt(total, currency)}</strong></span>
            <span>Paid: <strong className="text-emerald-500">{fmt(paid, currency)}</strong></span>
            <span>Due: <strong className="text-amber-500">{fmt(total - paid, currency)}</strong></span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// ============================ EVENTS ============================

const EventsSection = ({ data, setData, currency }: any) => {
  const [title, setTitle] = useState("");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const add = () => {
    const a = parseFloat(amt);
    if (!a || !title.trim()) return;
    const e: FamilyEvent = { id: uid(), title: title.trim(), amount: a, date: new Date(date).toISOString() };
    setData({ ...data, events: [...data.events, e] });
    setTitle(""); setAmt("");
  };
  const remove = (id: string) => setData({ ...data, events: data.events.filter((e: FamilyEvent) => e.id !== id) });
  const toggleHidden = (id: string) => setData({ ...data, events: data.events.map((e: FamilyEvent) => e.id === id ? { ...e, hidden: !e.hidden } : e) });
  const total = data.events.reduce((s: number, e: FamilyEvent) => s + (e.hidden ? 0 : e.amount), 0);

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Add Event</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder="Eid clothes / Aqeeqah / Wedding..." value={title} onChange={e => setTitle(e.target.value)} />
            <Input className="col-span-3" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input className="col-span-3" type="number" placeholder={`Amount (${currency})`} value={amt} onChange={e => setAmt(e.target.value)} />
            <Button className="col-span-1 bg-emerald-600 hover:bg-emerald-700" onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Events Log · Total: {fmt(total, currency)}</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {data.events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No events recorded.</p>}
          {data.events.slice().sort((a: FamilyEvent, b: FamilyEvent) => b.date.localeCompare(a.date)).map((e: FamilyEvent) => (
            <div key={e.id} className={`flex items-center gap-2 p-2 rounded border ${e.hidden ? "opacity-40 grayscale border-dashed border-border/30" : "border-border/50"}`}>
              <Button size="icon" variant="ghost" onClick={() => toggleHidden(e.id)} className="h-6 w-6 text-muted-foreground shrink-0" title={e.hidden ? "Show in calculations" : "Hide from calculations"}>
                {e.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium break-words">{e.title}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString()}</div>
              </div>
              <div className="text-sm font-semibold">{fmt(e.amount, currency)}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(e.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

// ============================ LOANS ============================

const LoansSection = ({ data, setData, currency }: any) => {
  const [type, setType] = useState<"borrowed" | "lent">("borrowed");
  const [counter, setCounter] = useState("");
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    const a = parseFloat(amt);
    if (!a || !counter.trim()) return;
    const l: Loan = {
      id: uid(), type, counterparty: counter.trim(), amount: a,
      date: new Date().toISOString(), dueDate: due || undefined, note,
      payments: [], status: "active",
    };
    setData({ ...data, loans: [...data.loans, l] });
    setCounter(""); setAmt(""); setDue(""); setNote("");
  };

  const update = (id: string, patch: Partial<Loan>) =>
    setData({ ...data, loans: data.loans.map((l: Loan) => l.id === id ? { ...l, ...patch } : l) });
  const remove = (id: string) => setData({ ...data, loans: data.loans.filter((l: Loan) => l.id !== id) });
  const addPayment = (id: string, amount: number) => {
    setData({
      ...data,
      loans: data.loans.map((l: Loan) => l.id === id
        ? { ...l, payments: [...l.payments, { id: uid(), amount, date: new Date().toISOString() }] }
        : l),
    });
  };

  const owe = data.loans.filter((l: Loan) => l.type === "borrowed" && l.status === "active");
  const lent = data.loans.filter((l: Loan) => l.type === "lent" && l.status === "active");
  const totalOwe = owe.reduce((s: number, l: Loan) => s + loanOutstanding(l), 0);
  const totalLent = lent.reduce((s: number, l: Loan) => s + loanOutstanding(l), 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="I Owe" value={fmt(totalOwe, currency)} accent="text-red-500" />
        <SummaryTile label="Owed To Me" value={fmt(totalLent, currency)} accent="text-emerald-500" />
        <SummaryTile label="Net" value={fmt(totalLent - totalOwe, currency)} accent={totalLent - totalOwe >= 0 ? "text-emerald-500" : "text-red-500"} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />New Loan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="borrowed">I borrowed (I owe)</SelectItem>
                <SelectItem value="lent">I lent (owed to me)</SelectItem>
              </SelectContent>
            </Select>
            <Input className="col-span-5" placeholder="Counterparty name" value={counter} onChange={e => setCounter(e.target.value)} />
            <Input className="col-span-3" type="number" placeholder={`Amount (${currency})`} value={amt} onChange={e => setAmt(e.target.value)} />
          </div>
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-4" type="date" value={due} onChange={e => setDue(e.target.value)} placeholder="Due date" />
            <Input className="col-span-7" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
            <Button className="col-span-1 bg-emerald-600 hover:bg-emerald-700" onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <LoanList title="Money I Owe" loans={owe} icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
        currency={currency} onPay={addPayment} onRemove={remove} onUpdate={update} />
      <LoanList title="Money Owed To Me" loans={lent} icon={<ArrowUpCircle className="h-4 w-4 text-emerald-500" />}
        currency={currency} onPay={addPayment} onRemove={remove} onUpdate={update} />

      {data.loans.some((l: Loan) => l.status !== "active") && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Settled / Written-off</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.loans.filter((l: Loan) => l.status !== "active").map((l: Loan) => (
              <div key={l.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                <span className="opacity-70 line-through">{l.counterparty} · {fmt(l.amount, currency)} · {l.status}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(l.id)} className="h-6 w-6 text-red-500"><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
};

const LoanList = ({ title, loans, icon, currency, onPay, onRemove, onUpdate }: any) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {loans.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">None.</p>}
      {loans.map((l: Loan) => (
        <LoanRow key={l.id} loan={l} currency={currency} onPay={onPay} onRemove={onRemove} onUpdate={onUpdate} />
      ))}
    </CardContent>
  </Card>
);

const LoanRow = ({ loan, currency, onPay, onRemove, onUpdate }: any) => {
  const [pay, setPay] = useState("");
  const out = loanOutstanding(loan);
  const overdue = loan.dueDate && new Date(loan.dueDate) < new Date() && out > 0;
  return (
    <div className="border border-border/50 rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold break-words">{loan.counterparty}</div>
          <div className="text-[11px] text-muted-foreground">
            {fmt(loan.amount, currency)} · {new Date(loan.date).toLocaleDateString()}
            {loan.dueDate && <> · due {new Date(loan.dueDate).toLocaleDateString()}</>}
          </div>
          {loan.note && <div className="text-[11px] text-muted-foreground italic">"{loan.note}"</div>}
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${out > 0 ? "text-amber-500" : "text-emerald-500"}`}>{fmt(out, currency)}</div>
          <div className="text-[10px] text-muted-foreground">outstanding</div>
        </div>
        {overdue && <Badge variant="destructive" className="text-[9px]">OVERDUE</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" placeholder="Payment amount" value={pay} onChange={e => setPay(e.target.value)} className="h-7 text-xs" />
        <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700" onClick={() => {
          const a = parseFloat(pay); if (!a) return;
          onPay(loan.id, a);
          if (a >= out) onUpdate(loan.id, { status: "settled" });
          setPay("");
        }}><Check className="h-3 w-3 mr-1" />Pay</Button>
        <Button size="sm" variant="outline" className="h-7" onClick={() => onUpdate(loan.id, { status: "written-off" })}><X className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onRemove(loan.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button>
      </div>
      {loan.payments.length > 0 && (
        <div className="text-[10px] text-muted-foreground space-y-0.5 pl-2 border-l-2 border-emerald-500/30">
          {loan.payments.map((p: any) => (
            <div key={p.id}>+ {fmt(p.amount, currency)} on {new Date(p.date).toLocaleDateString()}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================ ZAKAT ============================

const ZakatSection = ({ data, setData, currency }: any) => {
  const [wealth, setWealth] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    const w = parseFloat(wealth);
    if (!w || w <= 0) return;
    const z: ZakatRecord = {
      id: uid(), date: new Date().toISOString(), totalWealth: w, zakatDue: calcZakat(w),
      paid: false, note,
    };
    setData({ ...data, zakat: [...data.zakat, z] });
    setWealth(""); setNote("");
  };
  const togglePaid = (id: string) => setData({
    ...data,
    zakat: data.zakat.map((z: ZakatRecord) => z.id === id
      ? { ...z, paid: !z.paid, paidDate: !z.paid ? new Date().toISOString() : undefined } : z),
  });
  const remove = (id: string) => setData({ ...data, zakat: data.zakat.filter((z: ZakatRecord) => z.id !== id) });

  const totalDue = data.zakat.filter((z: ZakatRecord) => !z.paid).reduce((s: number, z: ZakatRecord) => s + z.zakatDue, 0);
  const totalPaid = data.zakat.filter((z: ZakatRecord) => z.paid).reduce((s: number, z: ZakatRecord) => s + z.zakatDue, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SummaryTile label="Zakat Pending" value={fmt(totalDue, currency)} accent="text-amber-500" />
        <SummaryTile label="Zakat Paid (lifetime)" value={fmt(totalPaid, currency)} accent="text-emerald-500" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Calculate Zakat</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Zakat is 2.5% of your zakatable wealth held for one lunar year (above nisab).</p>
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" type="number" placeholder={`Total wealth (${currency})`} value={wealth} onChange={e => setWealth(e.target.value)} />
            <Input className="col-span-6" placeholder="Note (e.g. Ramadan 1447)" value={note} onChange={e => setNote(e.target.value)} />
            <Button className="col-span-1 bg-emerald-600 hover:bg-emerald-700" size="icon" onClick={add}><Plus className="h-4 w-4" /></Button>
          </div>
          {wealth && parseFloat(wealth) > 0 && (
            <p className="text-sm">Calculated: <strong className="text-primary">{fmt(calcZakat(parseFloat(wealth)), currency)}</strong></p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Zakat History</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {data.zakat.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No zakat records.</p>}
          {data.zakat.slice().reverse().map((z: ZakatRecord) => (
            <div key={z.id}
              onClick={(ev) => { if ((ev.target as HTMLElement).closest("button")) return; togglePaid(z.id); }}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/40 ${z.paid ? "bg-emerald-500/5 border-emerald-500/30" : "border-border/50"}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Wealth: {fmt(z.totalWealth, currency)} · <strong className="text-primary">Zakat {fmt(z.zakatDue, currency)}</strong></div>
                <div className="text-[10px] text-muted-foreground">{new Date(z.date).toLocaleDateString()}{z.note && ` · ${z.note}`}{z.paid && z.paidDate && ` · paid ${new Date(z.paidDate).toLocaleDateString()}`}</div>
              </div>
              <Badge variant={z.paid ? "default" : "outline"} className="text-[9px]">{z.paid ? "PAID" : "PENDING"}</Badge>
              <Button size="icon" variant="ghost" onClick={() => remove(z.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

export default FamilyManager;
