import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Receipt, ArrowRightLeft, Copy, RotateCcw } from "lucide-react";
import { simplifyDebts, uid } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "expense-divider-v1";

interface Friend {
  id: string;
  name: string;
  paid: string;
}

interface SavedState {
  currency: string;
  totalBill: string;
  friends: Friend[];
}

const fmt = (n: number, c: string) => `${c} ${n.toFixed(2)}`;
const pct = (part: number, total: number) => (total > 0 ? ((part / total) * 100).toFixed(1) : "0");

const loadState = (): SavedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currency: "PKR", totalBill: "", friends: [] };
    const parsed = JSON.parse(raw);
    return {
      currency: typeof parsed.currency === "string" ? parsed.currency : "PKR",
      totalBill: typeof parsed.totalBill === "string" ? parsed.totalBill : "",
      friends: Array.isArray(parsed.friends)
        ? parsed.friends.filter(
            (f: Friend) => f && typeof f.id === "string" && typeof f.name === "string"
          )
        : [],
    };
  } catch {
    return { currency: "PKR", totalBill: "", friends: [] };
  }
};

export const ExpenseDivider = () => {
  const { toast } = useToast();
  const saved = useMemo(() => loadState(), []);
  const [currency, setCurrency] = useState(saved.currency);
  const [totalBill, setTotalBill] = useState(saved.totalBill);
  const [friends, setFriends] = useState<Friend[]>(saved.friends);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency, totalBill, friends }));
  }, [currency, totalBill, friends]);

  const addFriend = () => {
    const name = nameInput.trim();
    if (!name) return;
    if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Already added", description: `${name} is already on the list.`, variant: "destructive" });
      return;
    }
    setFriends((f) => [...f, { id: uid(), name, paid: "" }]);
    setNameInput("");
  };

  const removeFriend = (id: string) => setFriends((f) => f.filter((x) => x.id !== id));

  const updatePaid = (id: string, paid: string) =>
    setFriends((f) => f.map((x) => (x.id === id ? { ...x, paid } : x)));

  const reset = () => {
    if (!window.confirm("Clear all friends and bill?")) return;
    setTotalBill("");
    setFriends([]);
    setNameInput("");
  };

  const result = useMemo(() => {
    const total = parseFloat(totalBill) || 0;
    if (total <= 0 || friends.length < 2) return null;

    const n = friends.length;
    const rawShare = total / n;
    // Cent-safe equal split: first people get floor+0.01 if needed
    const base = Math.floor(rawShare * 100) / 100;
    const shares = friends.map((_, i) => {
      const rem = Math.round((total - base * n) * 100); // leftover cents
      return +(base + (i < rem ? 0.01 : 0)).toFixed(2);
    });
    // If rem is negative (floating), fall back to last-person adjust
    let shareList = shares;
    const shareSum = +(shares.reduce((s, x) => s + x, 0)).toFixed(2);
    if (Math.abs(shareSum - total) > 0.001) {
      const per = +(total / n).toFixed(2);
      shareList = friends.map((_, i) => (i === n - 1 ? +(total - per * (n - 1)).toFixed(2) : per));
    }

    const rows = friends.map((f, i) => {
      const paid = Math.max(0, parseFloat(f.paid) || 0);
      const share = shareList[i];
      const balance = +(paid - share).toFixed(2);
      return { ...f, paid, share, balance };
    });

    const totalPaid = +rows.reduce((s, r) => s + r.paid, 0).toFixed(2);
    const unpaidBill = +(total - totalPaid).toFixed(2);

    // Friend-to-friend balances (positive = should receive, negative = should pay)
    const balances: Record<string, number> = {};
    rows.forEach((r) => {
      balances[r.id] = r.balance;
    });

    const transfers = simplifyDebts(balances).map((t) => ({
      fromId: t.fromId,
      toId: t.toId,
      from: friends.find((f) => f.id === t.fromId)?.name || "?",
      to: friends.find((f) => f.id === t.toId)?.name || "?",
      amount: t.amount,
    }));

    // After friend transfers, leftover negative balances = still need to cover unpaid bill
    const afterBal = { ...balances };
    transfers.forEach((t) => {
      afterBal[t.fromId] = +((afterBal[t.fromId] || 0) + t.amount).toFixed(2);
      afterBal[t.toId] = +((afterBal[t.toId] || 0) - t.amount).toFixed(2);
    });

    const stillOweBill = Object.entries(afterBal)
      .filter(([, amt]) => amt < -0.01)
      .map(([id, amt]) => ({
        name: friends.find((f) => f.id === id)?.name || "?",
        amount: +(-amt).toFixed(2),
      }))
      .sort((a, b) => b.amount - a.amount);

    const stillOwedBack = Object.entries(afterBal)
      .filter(([, amt]) => amt > 0.01)
      .map(([id, amt]) => ({
        name: friends.find((f) => f.id === id)?.name || "?",
        amount: +amt.toFixed(2),
      }));

    const lines: string[] = [];
    lines.push(`Total bill: ${fmt(total, currency)}`);
    lines.push(`Friends: ${friends.map((f) => f.name).join(", ")} (${n})`);
    lines.push(`Equal share each: ${fmt(shareList[0], currency)}${shareList.some((s) => s !== shareList[0]) ? " (adjusted for cents)" : ""}`);
    lines.push(`Total paid so far: ${fmt(totalPaid, currency)} (${pct(totalPaid, total)}%)`);
    if (unpaidBill > 0.01) {
      lines.push(`Still unpaid on bill: ${fmt(unpaidBill, currency)}`);
    } else if (unpaidBill < -0.01) {
      lines.push(`Overpaid vs bill: ${fmt(-unpaidBill, currency)}`);
    }
    lines.push("");
    lines.push("Who paid what:");
    rows.forEach((r) => {
      lines.push(
        `• ${r.name}: paid ${fmt(r.paid, currency)} (${pct(r.paid, total)}%) | fair share ${fmt(r.share, currency)} | ${
          r.balance > 0.01
            ? `gets back ${fmt(r.balance, currency)}`
            : r.balance < -0.01
              ? `owes ${fmt(-r.balance, currency)}`
              : "settled"
        }`
      );
    });
    lines.push("");
    if (transfers.length === 0) {
      lines.push("Friend-to-friend transfers: none needed.");
    } else {
      lines.push("Who pays whom (friends):");
      transfers.forEach((t) => {
        lines.push(`→ ${t.from} pays ${t.to} ${fmt(t.amount, currency)}`);
      });
    }
    if (stillOweBill.length > 0 && unpaidBill > 0.01) {
      lines.push("");
      lines.push(`Remaining bill to cover (${fmt(unpaidBill, currency)}):`);
      stillOweBill.forEach((x) => {
        lines.push(`→ ${x.name} still needs to put ${fmt(x.amount, currency)} toward the bill`);
      });
    }
    if (stillOwedBack.length > 0) {
      lines.push("");
      lines.push("Note: after transfers, these still show leftover (check unpaid bill):");
      stillOwedBack.forEach((x) => lines.push(`• ${x.name}: ${fmt(x.amount, currency)}`));
    }

    return {
      shareList,
      rows,
      totalPaid,
      unpaidBill,
      transfers,
      stillOweBill,
      lines,
      total,
    };
  }, [friends, totalBill, currency]);

  const copySummary = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.lines.join("\n"));
    toast({ title: "Copied!", description: "Full summary copied to clipboard." });
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Expense Divider
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Add friends → total bill → who paid how much → full split + transfer lines.
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">1. Add Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Friend name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFriend()}
            />
            <Button onClick={addFriend} variant="outline" size="icon" type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {friends.length > 0 && (
            <div className="space-y-1">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <span className="text-sm font-medium flex-1">{f.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500"
                    type="button"
                    onClick={() => removeFriend(f.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {friends.length < 2 && (
            <p className="text-xs text-muted-foreground">At least 2 friends needed.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">2. Total Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Total bill amount"
                value={totalBill}
                onChange={(e) => setTotalBill(e.target.value)}
              />
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {friends.length >= 2 && parseFloat(totalBill) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">3. Who Paid How Much?</CardTitle>
            <p className="text-xs text-muted-foreground">
              Leave 0 for anyone who has not paid yet.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {friends.map((f) => {
              const paid = parseFloat(f.paid) || 0;
              const total = parseFloat(totalBill) || 0;
              return (
                <div key={f.id} className="flex items-center gap-2">
                  <Label className="text-sm w-24 shrink-0 truncate">{f.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={f.paid}
                    onChange={(e) => updatePaid(f.id, e.target.value)}
                    className="flex-1"
                  />
                  {total > 0 && paid > 0 && (
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {pct(paid, total)}%
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Split Result
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={copySummary} type="button">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={reset} type="button">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <div className="text-xs text-muted-foreground">Each person's share</div>
                <div className="text-2xl font-bold text-primary">
                  {fmt(result.shareList[0], currency)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total {fmt(result.total, currency)} ÷ {friends.length} · Paid so far{" "}
                  {fmt(result.totalPaid, currency)}
                </div>
                {result.unpaidBill > 0.01 && (
                  <div className="text-xs text-amber-600 mt-1 font-medium">
                    {fmt(result.unpaidBill, currency)} still unpaid on the bill
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {result.rows.map((r) => (
                  <div key={r.id} className="p-2 rounded border border-border/50 text-sm space-y-0.5">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Paid {fmt(r.paid, currency)} ({pct(r.paid, result.total)}%) · Share{" "}
                      {fmt(r.share, currency)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        r.balance > 0.01
                          ? "text-emerald-600"
                          : r.balance < -0.01
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {r.balance > 0.01
                        ? `Gets back ${fmt(r.balance, currency)}`
                        : r.balance < -0.01
                          ? `Owes ${fmt(-r.balance, currency)}`
                          : "Settled ✓"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Transfer Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.transfers.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-2">
                  No transfers needed between friends
                </p>
              ) : (
                result.transfers.map((t, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm"
                  >
                    <strong>{t.from}</strong> pays <strong>{t.to}</strong>{" "}
                    <span className="font-bold text-primary">{fmt(t.amount, currency)}</span>
                  </div>
                ))
              )}

              {result.stillOweBill.length > 0 && result.unpaidBill > 0.01 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {fmt(result.unpaidBill, currency)} still due — these people should cover it:
                  </p>
                  {result.stillOweBill.map((x, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm"
                    >
                      <strong>{x.name}</strong> puts{" "}
                      <span className="font-bold">{fmt(x.amount, currency)}</span> toward the bill
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 p-3 rounded bg-muted/30 text-xs space-y-1 font-mono leading-relaxed whitespace-pre-wrap">
                {result.lines.map((line, i) => (
                  <div key={i} className={line === "" ? "h-2" : ""}>
                    {line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ExpenseDivider;
