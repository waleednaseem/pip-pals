import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Plus, Trash2, ArrowLeft, Receipt, HandCoins, Download, ChevronRight,
  SplitSquareHorizontal, History, UserPlus, Sparkles, CheckCircle2,
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

type InnerTab = "split" | "settle" | "history" | "friends";

type TabUnread = Record<Exclude<InnerTab, "split">, boolean>;

const unreadKey = (groupId: string) => `group-tab-unread-${groupId}`;

const loadUnread = (groupId: string): TabUnread => {
  try {
    const raw = localStorage.getItem(unreadKey(groupId));
    if (!raw) return { settle: false, history: false, friends: false };
    const p = JSON.parse(raw);
    return {
      settle: !!p.settle,
      history: !!p.history,
      friends: !!p.friends,
    };
  } catch {
    return { settle: false, history: false, friends: false };
  }
};

const saveUnread = (groupId: string, u: TabUnread) => {
  localStorage.setItem(unreadKey(groupId), JSON.stringify(u));
};

const RedDot = () => (
  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
);

export const GroupExpenses = () => {
  const [data, setData] = useState<GroupExpensesData>(() => getGroupData());
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    saveGroupData(data);
  }, [data]);

  const updateGroup = (id: string, patch: Partial<ExpenseGroup>) =>
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));

  const removeGroup = (id: string) => {
    if (!confirm("Delete this group and all its expenses?")) return;
    setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }));
    if (activeId === id) setActiveId(null);
  };

  const active = data.groups.find((g) => g.id === activeId);

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

const GroupsList = ({
  data,
  setData,
  onOpen,
  onRemove,
}: {
  data: GroupExpensesData;
  setData: React.Dispatch<React.SetStateAction<GroupExpensesData>>;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showCreate, setShowCreate] = useState(data.groups.length === 0);

  const addMember = () => {
    if (!memberInput.trim()) return;
    if (members.some((m) => m.name.toLowerCase() === memberInput.trim().toLowerCase())) return;
    setMembers([...members, { id: uid(), name: memberInput.trim() }]);
    setMemberInput("");
  };

  const createGroup = () => {
    if (!name.trim() || members.length < 2) return;
    const g: ExpenseGroup = {
      id: uid(),
      name: name.trim(),
      currency,
      createdAt: new Date().toISOString(),
      members,
      expenses: [],
      settlements: [],
    };
    setData((d) => ({ ...d, groups: [...d.groups, g] }));
    setName("");
    setMembers([]);
    setMemberInput("");
    setShowCreate(false);
    onOpen(g.id);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Group Expenses
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Split bills with friends in 3 steps: add friends → enter who paid → settle.
          </p>
        </CardHeader>
        {data.groups.length === 0 && (
          <CardContent className="pt-0">
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="font-semibold text-foreground mb-1">1. Friends</div>
                Create a group and add names
              </div>
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="font-semibold text-foreground mb-1">2. Split</div>
                Type what each friend paid
              </div>
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="font-semibold text-foreground mb-1">3. Settle</div>
                See who pays whom — Mark Paid
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {!showCreate && (
        <Button onClick={() => setShowCreate(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      )}

      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create your first group
            </CardTitle>
            <p className="text-xs text-muted-foreground">Need at least 2 friends.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-8"
                placeholder="Group name (e.g. Friday Dinner)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="col-span-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["PKR", "USD", "CAD", "AED", "SAR", "EUR", "GBP", "INR"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Add friends by name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Friend name"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                />
                <Button onClick={addMember} variant="outline" size="icon" type="button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {members.map((m) => (
                    <Badge
                      key={m.id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                    >
                      {m.name} <Trash2 className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {data.groups.length > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)} type="button">
                  Cancel
                </Button>
              )}
              <Button
                onClick={createGroup}
                disabled={!name.trim() || members.length < 2}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                type="button"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create & Open
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {data.groups.length === 0 && !showCreate && (
          <p className="text-center text-sm text-muted-foreground py-8">No groups yet.</p>
        )}
        {data.groups.map((g) => {
          const pending = simplifyDebts(computeBalances(g)).length;
          const totalSpend = g.expenses.reduce((s, e) => s + e.amount, 0);
          const unread = loadUnread(g.id);
          const hasDot = unread.settle || unread.history || unread.friends;
          return (
            <Card
              key={g.id}
              className="cursor-pointer hover:border-primary/50 transition relative"
              onClick={() => onOpen(g.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative">
                  <Users className="h-5 w-5 text-primary" />
                  {hasDot && <RedDot />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold break-words">{g.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {g.members.length} friends · {g.expenses.length} expenses · {fmt(totalSpend, g.currency)}
                    {pending > 0 && (
                      <span className="text-amber-600"> · {pending} to settle</span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(g.id);
                  }}
                  className="h-8 w-8 text-red-500"
                  type="button"
                >
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

const GroupDetail = ({
  group,
  onBack,
  onUpdate,
  onRemove,
  toast,
}: {
  group: ExpenseGroup;
  onBack: () => void;
  onUpdate: (patch: Partial<ExpenseGroup>) => void;
  onRemove: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) => {
  const [tab, setTab] = useState<InnerTab>("split");
  const [unread, setUnread] = useState<TabUnread>(() => loadUnread(group.id));
  const [memberInput, setMemberInput] = useState("");

  const balances = useMemo(() => computeBalances(group), [group]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const totalSpend = group.expenses.reduce((s, e) => s + e.amount, 0);

  useEffect(() => {
    saveUnread(group.id, unread);
  }, [group.id, unread]);

  const markTabsUnread = (keys: (keyof TabUnread)[]) => {
    setUnread((u) => {
      const next = { ...u };
      keys.forEach((k) => {
        next[k] = true;
      });
      return next;
    });
  };

  const visitTab = (next: string) => {
    const t = next as InnerTab;
    setTab(t);
    if (t !== "split") {
      setUnread((u) => ({ ...u, [t]: false }));
    }
  };

  const addMember = () => {
    if (!memberInput.trim()) return;
    onUpdate({ members: [...group.members, { id: uid(), name: memberInput.trim() }] });
    setMemberInput("");
    markTabsUnread(["friends"]);
    toast({ title: "Friend added" });
  };

  const removeMember = (id: string) => {
    if (group.expenses.some((e) => e.payerId === id || e.splits.some((s) => s.memberId === id))) {
      toast({
        title: "Cannot remove",
        description: "Friend is part of existing expenses.",
        variant: "destructive",
      });
      return;
    }
    onUpdate({ members: group.members.filter((m) => m.id !== id) });
  };

  const addExpenses = (items: GroupExpense[]) => {
    onUpdate({ expenses: [...group.expenses, ...items] });
    markTabsUnread(["settle", "history", "friends"]);
    setTab("settle");
    setUnread((u) => ({ ...u, settle: false }));
  };

  const removeExpense = (id: string) => {
    onUpdate({ expenses: group.expenses.filter((e) => e.id !== id) });
    markTabsUnread(["settle", "friends"]);
  };

  const recordSettlement = (fromId: string, toId: string, amount: number) => {
    const already = group.settlements.some(
      (s) =>
        s.fromId === fromId &&
        s.toId === toId &&
        Math.abs(s.amount - amount) < 0.02 &&
        new Date(s.date).toDateString() === new Date().toDateString()
    );
    if (already) {
      toast({
        title: "Already recorded",
        description: "This payment was already marked today.",
        variant: "destructive",
      });
      return;
    }
    const s: GroupSettlement = {
      id: uid(),
      fromId,
      toId,
      amount,
      date: new Date().toISOString(),
    };
    onUpdate({ settlements: [...group.settlements, s] });
    markTabsUnread(["history", "friends"]);
    toast({ title: "Payment recorded", description: "Check History for the update." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;
    doc.setFontSize(16);
    doc.text(group.name, 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      `Currency: ${group.currency} · ${group.members.length} members · Total: ${fmt(totalSpend, group.currency)}`,
      15,
      y
    );
    y += 8;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Balances", 15, y);
    y += 6;
    doc.setFontSize(10);
    group.members.forEach((m) => {
      const b = balances[m.id] || 0;
      const status =
        b > 0 ? `gets back ${fmt(b, group.currency)}` : b < 0 ? `owes ${fmt(-b, group.currency)}` : "settled";
      doc.text(`• ${m.name} — ${status}`, 18, y);
      y += 5;
    });
    y += 4;
    doc.setFontSize(12);
    doc.text("Who pays whom", 15, y);
    y += 6;
    doc.setFontSize(10);
    if (transfers.length === 0) {
      doc.text("All settled.", 18, y);
      y += 5;
    } else {
      transfers.forEach((s) => {
        const from = group.members.find((m) => m.id === s.fromId)?.name;
        const to = group.members.find((m) => m.id === s.toId)?.name;
        doc.text(`${from} → ${to}: ${fmt(s.amount, group.currency)}`, 18, y);
        y += 5;
      });
    }
    doc.save(`${group.name.replace(/\s+/g, "_")}_summary.pdf`);
  };

  const TabLabel = ({
    value,
    icon: Icon,
    label,
  }: {
    value: InnerTab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <TabsTrigger value={value} className="relative flex-1 gap-1 text-xs sm:text-sm data-[state=active]:shadow-sm">
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden xs:inline sm:inline">{label}</span>
      {value !== "split" && unread[value] && <RedDot />}
    </TabsTrigger>
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onBack} type="button">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Groups
        </Button>
        <div className="flex-1 text-center min-w-0">
          <h2 className="text-lg font-bold truncate">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members.length} friends · Total spent {fmt(totalSpend, group.currency)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF} type="button">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onRemove} className="text-red-500" type="button">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={visitTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-11">
          <TabLabel value="split" icon={SplitSquareHorizontal} label="Split" />
          <TabLabel value="settle" icon={HandCoins} label="Settle" />
          <TabLabel value="history" icon={History} label="History" />
          <TabLabel value="friends" icon={UserPlus} label="Friends" />
        </TabsList>

        {/* SPLIT */}
        <TabsContent value="split" className="mt-4 space-y-3">
          <Card className="border-dashed">
            <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">How it works</p>
              <p>1. Write what you spent on (dinner, trip…)</p>
              <p>2. Type how much each friend paid (leave blank if 0)</p>
              <p>3. Tap Add — then open Settle to see who owes whom</p>
            </CardContent>
          </Card>
          <AddExpenseForm group={group} onAdd={addExpenses} />
        </TabsContent>

        {/* SETTLE */}
        <TabsContent value="settle" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-primary" />
                Who pays whom
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Follow these lines. Tap Mark Paid after money is transferred.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {transfers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-medium">All settled</p>
                  <p className="text-xs text-muted-foreground">
                    {group.expenses.length === 0
                      ? "Add a split first from the Split tab."
                      : "No transfers needed right now."}
                  </p>
                </div>
              ) : (
                transfers.map((s, i) => {
                  const from = group.members.find((m) => m.id === s.fromId);
                  const to = group.members.find((m) => m.id === s.toId);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5"
                    >
                      <div className="flex-1 text-sm min-w-0">
                        <strong>{from?.name}</strong>
                        <span className="text-muted-foreground"> pays </span>
                        <strong>{to?.name}</strong>
                        <div className="font-bold text-primary mt-0.5">{fmt(s.amount, group.currency)}</div>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700 shrink-0"
                        onClick={() => recordSettlement(s.fromId, s.toId, s.amount)}
                        type="button"
                      >
                        Mark Paid
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.members.map((m) => {
                const b = balances[m.id] || 0;
                return (
                  <div key={m.id} className="flex justify-between items-center p-2 rounded bg-muted/30 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span
                      className={`font-semibold ${
                        b > 0.01 ? "text-emerald-500" : b < -0.01 ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      {b > 0.01
                        ? `gets ${fmt(b, group.currency)}`
                        : b < -0.01
                          ? `owes ${fmt(-b, group.currency)}`
                          : "settled"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Expenses ({group.expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.expenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No expenses yet. Add one from Split.
                </p>
              )}
              {group.expenses
                .slice()
                .reverse()
                .map((e) => {
                  const payer = group.members.find((m) => m.id === e.payerId);
                  return (
                    <div key={e.id} className="border border-border/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium break-words">{e.description}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(e.date).toLocaleString()} · paid by <strong>{payer?.name}</strong>
                          </div>
                        </div>
                        <div className="text-sm font-bold shrink-0">{fmt(e.amount, group.currency)}</div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeExpense(e.id)}
                          className="h-7 w-7 text-red-500 shrink-0"
                          type="button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {e.splits.map((s) => {
                          const m = group.members.find((mm) => mm.id === s.memberId);
                          return (
                            <Badge key={s.memberId} variant="outline" className="text-[9px]">
                              {m?.name}: {fmt(s.share, group.currency)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payments marked</CardTitle>
              <p className="text-xs text-muted-foreground">Settlements you tapped Mark Paid on.</p>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.settlements.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No payments marked yet.</p>
              )}
              {group.settlements
                .slice()
                .reverse()
                .map((s) => {
                  const from = group.members.find((m) => m.id === s.fromId);
                  const to = group.members.find((m) => m.id === s.toId);
                  return (
                    <div key={s.id} className="flex justify-between text-sm p-2 rounded bg-emerald-500/5 gap-2">
                      <span>
                        {from?.name} → {to?.name}: <strong>{fmt(s.amount, group.currency)}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(s.date).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FRIENDS */}
        <TabsContent value="friends" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Friends & balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.members.map((m) => {
                const b = balances[m.id] || 0;
                return (
                  <div key={m.id} className="flex justify-between items-center p-2 rounded bg-muted/30 gap-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span
                      className={`text-sm font-semibold ${
                        b > 0.01 ? "text-emerald-500" : b < -0.01 ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      {b > 0.01
                        ? `gets ${fmt(b, group.currency)}`
                        : b < -0.01
                          ? `owes ${fmt(-b, group.currency)}`
                          : "settled"}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMember(m.id)}
                      className="h-6 w-6 text-red-500"
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-3">
                <Input
                  placeholder="Add friend name"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                  className="h-9"
                />
                <Button size="sm" onClick={addMember} variant="outline" type="button">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      toast({ title: "Add a short description", variant: "destructive" });
      return;
    }

    const activeMembers = group.members.filter((m) => included[m.id]);
    if (activeMembers.length === 0) {
      toast({ title: "Select at least one friend", variant: "destructive" });
      return;
    }

    const payers = group.members
      .map((m) => ({ memberId: m.id, amount: parseFloat(paid[m.id] || "0") || 0 }))
      .filter((p) => p.amount > 0);

    if (payers.length === 0) {
      toast({
        title: "Who paid?",
        description: "Enter at least one paid amount.",
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
    toast({
      title: "Split added!",
      description: `Total ${fmt(billTotal, group.currency)} — check Settle tab`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          New split
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">What was it?</Label>
          <Input
            className="mt-1"
            placeholder="e.g. Dinner at KFC"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Who paid how much?</Label>
          <div className="space-y-1.5">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={included[m.id] ?? true}
                  onChange={(e) => setIncluded({ ...included, [m.id]: e.target.checked })}
                  title="Include in split"
                />
                <span className="text-sm flex-1 truncate">{m.name}</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={paid[m.id] || ""}
                  onChange={(e) => setPaid({ ...paid, [m.id]: e.target.value })}
                  className="h-8 w-28"
                />
                {showAdvanced && mode !== "equal" && included[m.id] && (
                  <Input
                    type="number"
                    placeholder={mode === "percentage" ? "%" : mode === "shares" ? "shares" : group.currency}
                    value={custom[m.id] || ""}
                    onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                    className="h-8 w-20 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
          {totalPaid > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Bill total: <strong>{fmt(totalPaid, group.currency)}</strong>
              {group.members.filter((m) => included[m.id]).length > 0 && (
                <>
                  {" "}
                  · ~each{" "}
                  <strong>
                    {fmt(
                      totalPaid / Math.max(1, group.members.filter((m) => included[m.id]).length),
                      group.currency
                    )}
                  </strong>
                </>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide advanced split" : "Advanced split options"}
        </button>

        {showAdvanced && (
          <Select value={mode} onValueChange={(v: GroupExpense["splitMode"]) => setMode(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Split equally (default)</SelectItem>
              <SelectItem value="unequal">Custom amounts</SelectItem>
              <SelectItem value="percentage">By percentage</SelectItem>
              <SelectItem value="shares">By shares</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700" type="button">
          <Plus className="h-4 w-4 mr-1" />
          Add Split
        </Button>
      </CardContent>
    </Card>
  );
};

export default GroupExpenses;
