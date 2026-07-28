import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Trash2, ArrowLeft, Receipt, HandCoins, Download, ChevronRight,
} from "lucide-react";
import {
  GroupExpensesData, ExpenseGroup, GroupMember, GroupExpense, GroupSettlement,
} from "@/types/family";
import {
  getGroupData, saveGroupData, computeSplits, computeBalances, simplifyDebts, uid,
} from "@/utils/family";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const fmt = (n: number, c: string) => `${c} ${(n || 0).toFixed(2)}`;

export const GroupExpenses = () => {
  const [data, setData] = useState<GroupExpensesData>(() => getGroupData());
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { saveGroupData(data); }, [data]);

  const updateGroup = (id: string, patch: Partial<ExpenseGroup>) =>
    setData(d => ({ ...d, groups: d.groups.map(g => g.id === id ? { ...g, ...patch } : g) }));

  const removeGroup = (id: string) => {
    if (!confirm("Delete this group and all its expenses?")) return;
    setData(d => ({ ...d, groups: d.groups.filter(g => g.id !== id) }));
    if (activeId === id) setActiveId(null);
  };

  const active = data.groups.find(g => g.id === activeId);

  if (active) {
    return (
      <GroupDetail
        group={active}
        onBack={() => setActiveId(null)}
        onUpdate={(patch) => updateGroup(active.id, patch)}
        onRemove={() => removeGroup(active.id)}
        toast={toast}
      />
    );
  }

  return <GroupsList data={data} setData={setData} onOpen={setActiveId} onRemove={removeGroup} />;
};

// ========== GROUPS LIST ==========

const GroupsList = ({ data, setData, onOpen, onRemove }: any) => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);

  const addMember = () => {
    if (!memberInput.trim()) return;
    setMembers([...members, { id: uid(), name: memberInput.trim() }]);
    setMemberInput("");
  };

  const createGroup = () => {
    if (!name.trim() || members.length < 2) return;
    const g: ExpenseGroup = {
      id: uid(), name: name.trim(), currency, createdAt: new Date().toISOString(),
      members, expenses: [], settlements: [],
    };
    setData((d: GroupExpensesData) => ({ ...d, groups: [...d.groups, g] }));
    setName(""); setMembers([]); setMemberInput("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Group Expenses</CardTitle>
          <p className="text-xs text-muted-foreground">Dosto k saath kharcha share karo — Splitwise style. Lifetime maintained.</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Create New Group</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-8" placeholder="Group name (e.g. Friday Dinner Crew)" value={name} onChange={e => setName(e.target.value)} />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PKR", "USD", "CAD", "AED", "SAR", "EUR", "GBP", "INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Members (need at least 2)</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="Member name" value={memberInput} onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addMember()} />
              <Button onClick={addMember} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
            </div>
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {members.map(m => (
                  <Badge key={m.id} variant="secondary" className="cursor-pointer"
                    onClick={() => setMembers(members.filter(x => x.id !== m.id))}>
                    {m.name} <Trash2 className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button onClick={createGroup} disabled={!name.trim() || members.length < 2}
            className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" />Create Group
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {data.groups.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No groups yet. Create one above to get started.</p>
        )}
        {data.groups.map((g: ExpenseGroup) => {
          const balances = computeBalances(g);
          const totalSpend = g.expenses.reduce((s, e) => s + e.amount, 0);
          return (
            <Card key={g.id} className="cursor-pointer hover:border-primary/50 transition" onClick={() => onOpen(g.id)}>
              <CardContent className="p-3 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold break-words">{g.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {g.members.length} members · {g.expenses.length} expenses · Total {fmt(totalSpend, g.currency)}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemove(g.id); }} className="h-8 w-8 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ========== GROUP DETAIL ==========

const GroupDetail = ({ group, onBack, onUpdate, onRemove, toast }: any) => {
  const [memberInput, setMemberInput] = useState("");

  const balances = useMemo(() => computeBalances(group), [group]);
  const settlements = useMemo(() => simplifyDebts(balances), [balances]);
  const totalSpend = group.expenses.reduce((s: number, e: GroupExpense) => s + e.amount, 0);

  const addMember = () => {
    if (!memberInput.trim()) return;
    onUpdate({ members: [...group.members, { id: uid(), name: memberInput.trim() }] });
    setMemberInput("");
  };

  const removeMember = (id: string) => {
    if (group.expenses.some((e: GroupExpense) => e.payerId === id || e.splits.some(s => s.memberId === id))) {
      toast({ title: "Cannot remove", description: "Member is part of existing expenses.", variant: "destructive" });
      return;
    }
    onUpdate({ members: group.members.filter((m: GroupMember) => m.id !== id) });
  };

  const addExpenses = (items: GroupExpense[]) =>
    onUpdate({ expenses: [...group.expenses, ...items] });
  const removeExpense = (id: string) => onUpdate({ expenses: group.expenses.filter((e: GroupExpense) => e.id !== id) });

  const recordSettlement = (fromId: string, toId: string, amount: number) => {
    const already = group.settlements.some(
      (s: GroupSettlement) =>
        s.fromId === fromId &&
        s.toId === toId &&
        Math.abs(s.amount - amount) < 0.02 &&
        new Date(s.date).toDateString() === new Date().toDateString()
    );
    if (already) {
      toast({ title: "Already recorded", description: "This payment was already marked today.", variant: "destructive" });
      return;
    }
    const s: GroupSettlement = { id: uid(), fromId, toId, amount, date: new Date().toISOString() };
    onUpdate({ settlements: [...group.settlements, s] });
    toast({ title: "Settlement recorded" });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;
    doc.setFontSize(16); doc.text(group.name, 15, y); y += 7;
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Currency: ${group.currency} · ${group.members.length} members · Total: ${fmt(totalSpend, group.currency)}`, 15, y); y += 8;

    doc.setTextColor(0); doc.setFontSize(12); doc.text("Members", 15, y); y += 6;
    doc.setFontSize(10);
    group.members.forEach((m: GroupMember) => {
      const b = balances[m.id] || 0;
      const status = b > 0 ? `gets back ${fmt(b, group.currency)}` : b < 0 ? `owes ${fmt(-b, group.currency)}` : "settled";
      doc.text(`• ${m.name} — ${status}`, 18, y); y += 5;
    });
    y += 4;

    doc.setFontSize(12); doc.text("Settlement Plan (simplified)", 15, y); y += 6;
    doc.setFontSize(10);
    if (settlements.length === 0) { doc.text("All settled.", 18, y); y += 5; }
    else settlements.forEach(s => {
      const from = group.members.find((m: GroupMember) => m.id === s.fromId)?.name;
      const to = group.members.find((m: GroupMember) => m.id === s.toId)?.name;
      doc.text(`${from} → ${to}: ${fmt(s.amount, group.currency)}`, 18, y); y += 5;
    });
    y += 4;

    doc.setFontSize(12); doc.text("Expenses", 15, y); y += 6;
    doc.setFontSize(9);
    group.expenses.forEach((e: GroupExpense) => {
      if (y > 270) { doc.addPage(); y = 15; }
      const payer = group.members.find((m: GroupMember) => m.id === e.payerId)?.name;
      doc.text(`${new Date(e.date).toLocaleDateString()} · ${e.description} — ${fmt(e.amount, group.currency)} (paid by ${payer})`, 15, y);
      y += 4;
      e.splits.forEach(sp => {
        const mn = group.members.find((m: GroupMember) => m.id === sp.memberId)?.name;
        doc.text(`     ${mn}: ${fmt(sp.share, group.currency)}`, 18, y);
        y += 4;
      });
      y += 1;
    });

    doc.save(`${group.name.replace(/\s+/g, "_")}_summary.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">Total: {fmt(totalSpend, group.currency)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
        <Button variant="outline" size="sm" onClick={onRemove} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
      </div>

      {/* Balances */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Balances</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {group.members.map((m: GroupMember) => {
            const b = balances[m.id] || 0;
            return (
              <div key={m.id} className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm font-medium">{m.name}</span>
                <span className={`text-sm font-semibold ${b > 0.01 ? "text-emerald-500" : b < -0.01 ? "text-red-500" : "text-muted-foreground"}`}>
                  {b > 0.01 ? `gets ${fmt(b, group.currency)}` : b < -0.01 ? `owes ${fmt(-b, group.currency)}` : "settled"}
                </span>
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)} className="h-6 w-6 text-red-500"><Trash2 className="h-3 w-3" /></Button>
              </div>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Add member" value={memberInput} onChange={e => setMemberInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMember()} className="h-8" />
            <Button size="sm" onClick={addMember} variant="outline"><Plus className="h-3 w-3" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Settlement plan */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><HandCoins className="h-4 w-4 text-primary" />Settle Up (Simplified)</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {settlements.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">All settled. 🎉</p>}
          {settlements.map((s, i) => {
            const from = group.members.find((m: GroupMember) => m.id === s.fromId);
            const to = group.members.find((m: GroupMember) => m.id === s.toId);
            return (
              <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/50">
                <div className="flex-1 text-sm">
                  <strong>{from?.name}</strong> → <strong>{to?.name}</strong>
                  <span className="text-muted-foreground ml-2">{fmt(s.amount, group.currency)}</span>
                </div>
                <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700"
                  onClick={() => recordSettlement(s.fromId, s.toId, s.amount)}>Mark Paid</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add expense */}
      <AddExpenseForm group={group} onAdd={addExpenses} />

      {/* Expense log */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Expense History ({group.expenses.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {group.expenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No expenses yet.</p>}
          {group.expenses.slice().reverse().map((e: GroupExpense) => {
            const payer = group.members.find((m: GroupMember) => m.id === e.payerId);
            return (
              <div key={e.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium break-words">{e.description}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString()} · paid by <strong>{payer?.name}</strong> · {e.splitMode}
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmt(e.amount, group.currency)}</div>
                  <Button size="icon" variant="ghost" onClick={() => removeExpense(e.id)} className="h-6 w-6 text-red-500"><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {e.splits.map(s => {
                    const m = group.members.find((mm: GroupMember) => mm.id === s.memberId);
                    return <Badge key={s.memberId} variant="outline" className="text-[9px]">{m?.name}: {fmt(s.share, group.currency)}</Badge>;
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {group.settlements.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Settlement History</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {group.settlements.slice().reverse().map((s: GroupSettlement) => {
              const from = group.members.find((m: GroupMember) => m.id === s.fromId);
              const to = group.members.find((m: GroupMember) => m.id === s.toId);
              return (
                <div key={s.id} className="flex justify-between text-xs p-2 rounded bg-emerald-500/5">
                  <span>{from?.name} → {to?.name}: <strong>{fmt(s.amount, group.currency)}</strong></span>
                  <span className="text-muted-foreground">{new Date(s.date).toLocaleDateString()}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const AddExpenseForm = ({
  group,
  onAdd,
}: {
  group: ExpenseGroup;
  onAdd: (items: GroupExpense[]) => void;
}) => {
  const { toast } = useToast();
  const [desc, setDesc] = useState("");
  const [mode, setMode] = useState<GroupExpense["splitMode"]>("equal");
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(group.members.map((m) => [m.id, true]))
  );
  const [paid, setPaid] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});

  useEffect(() => {
    setIncluded((prev) => {
      const next: Record<string, boolean> = {};
      group.members.forEach((m) => {
        next[m.id] = prev[m.id] ?? true;
      });
      return next;
    });
  }, [group.members]);

  const totalPaid = group.members.reduce((s, m) => s + (parseFloat(paid[m.id] || "0") || 0), 0);

  const submit = () => {
    if (!desc.trim()) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }

    const activeMembers = group.members.filter((m) => included[m.id]);
    if (activeMembers.length === 0) {
      toast({ title: "Select at least one member", variant: "destructive" });
      return;
    }

    const payers = group.members
      .map((m) => ({ memberId: m.id, amount: parseFloat(paid[m.id] || "0") || 0 }))
      .filter((p) => p.amount > 0);

    if (payers.length === 0) {
      toast({
        title: "Who paid?",
        description: "Kam az kam ek friend ke paid amount likho.",
        variant: "destructive",
      });
      return;
    }

    const billTotal = +payers.reduce((s, p) => s + p.amount, 0).toFixed(2);

    if (mode === "unequal" || mode === "percentage") {
      const customArr = activeMembers.map((m) => ({
        memberId: m.id,
        value: parseFloat(custom[m.id] || "0") || 0,
      }));
      if (mode === "unequal") {
        const sum = customArr.reduce((s, c) => s + c.value, 0);
        if (Math.abs(sum - billTotal) > 0.02) {
          toast({
            title: "Invalid split",
            description: `Shares must total ${billTotal.toFixed(2)}`,
            variant: "destructive",
          });
          return;
        }
      }
      if (mode === "percentage") {
        const sum = customArr.reduce((s, c) => s + c.value, 0);
        if (Math.abs(sum - 100) > 0.5) {
          toast({ title: "Invalid split", description: "Percentages must total 100%", variant: "destructive" });
          return;
        }
      }
    }

    const now = new Date().toISOString();
    const items: GroupExpense[] = payers.map((p) => {
      let splits;
      if (mode === "equal") {
        splits = computeSplits(p.amount, activeMembers, "equal");
      } else {
        const customArr = activeMembers.map((m) => ({
          memberId: m.id,
          value: parseFloat(custom[m.id] || "0") || 0,
        }));
        // Scale custom split of full bill to this payment's portion
        const fullSplits = computeSplits(billTotal, activeMembers, mode, customArr);
        const ratio = billTotal > 0 ? p.amount / billTotal : 0;
        splits = fullSplits.map((s) => ({
          memberId: s.memberId,
          share: +(s.share * ratio).toFixed(2),
        }));
        const diff = +(p.amount - splits.reduce((s, x) => s + x.share, 0)).toFixed(2);
        if (diff !== 0 && splits.length > 0) {
          splits[splits.length - 1].share = +(splits[splits.length - 1].share + diff).toFixed(2);
        }
      }

      return {
        id: uid(),
        description: payers.length > 1 ? `${desc.trim()} (paid portion)` : desc.trim(),
        amount: p.amount,
        payerId: p.memberId,
        date: now,
        splitMode: mode,
        splits,
      };
    });

    onAdd(items);
    setDesc("");
    setPaid({});
    setCustom({});
    toast({ title: "Expense added", description: `Total ${fmt(billTotal, group.currency)}` });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Add Expense
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-12 gap-2">
          <Input
            className="col-span-8"
            placeholder="Description (e.g. Dinner at KFC)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Select value={mode} onValueChange={(v: GroupExpense["splitMode"]) => setMode(v)}>
            <SelectTrigger className="col-span-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Split equally</SelectItem>
              <SelectItem value="unequal">Custom amounts</SelectItem>
              <SelectItem value="percentage">By percentage</SelectItem>
              <SelectItem value="shares">By shares</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Who paid how much? (0 = nahi diya)</Label>
          <div className="space-y-1">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={included[m.id] ?? true}
                  onChange={(e) => setIncluded({ ...included, [m.id]: e.target.checked })}
                />
                <span className="text-sm flex-1 truncate">{m.name}</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Paid"
                  value={paid[m.id] || ""}
                  onChange={(e) => setPaid({ ...paid, [m.id]: e.target.value })}
                  className="h-7 w-24 text-xs"
                />
                {mode !== "equal" && included[m.id] && (
                  <Input
                    type="number"
                    placeholder={mode === "percentage" ? "%" : mode === "shares" ? "shares" : group.currency}
                    value={custom[m.id] || ""}
                    onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                    className="h-7 w-20 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
          {totalPaid > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Total paid: <strong>{fmt(totalPaid, group.currency)}</strong>
            </p>
          )}
        </div>

        <Button onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700" type="button">
          <Plus className="h-4 w-4 mr-1" />
          Add Expense
        </Button>
      </CardContent>
    </Card>
  );
};

export default GroupExpenses;
