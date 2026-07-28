import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Repeat } from "lucide-react";
import {
  FamilySubscription,
  FamilyCountryKey,
  RecurrenceFreq,
  FAMILY_COUNTRY_OPTIONS,
} from "@/types/family";
import { getFamilyData, saveFamilyData, uid, addNotification } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";

interface Props {
  currency: string;
  onChanged?: () => void;
}

const fmt = (n: number, c: string) => `${c} ${(n || 0).toFixed(2)}`;

export default function SubscriptionsManager({ currency, onChanged }: Props) {
  const { toast } = useToast();
  const [subs, setSubs] = useState<FamilySubscription[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState<RecurrenceFreq>("monthly");
  const [country, setCountry] = useState<FamilyCountryKey>("canada");
  const [category, setCategory] = useState("school_fee");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const reload = () => {
    const data = getFamilyData();
    setSubs(data.subscriptions || []);
  };

  useEffect(() => {
    reload();
  }, []);

  const persist = (next: FamilySubscription[]) => {
    const data = getFamilyData();
    data.subscriptions = next;
    saveFamilyData(data);
    setSubs(next);
    onChanged?.();
  };

  const add = () => {
    const a = parseFloat(amount);
    if (!name.trim() || !a || a <= 0) {
      toast({ title: "Invalid", description: "Name + amount required", variant: "destructive" });
      return;
    }
    const sub: FamilySubscription = {
      id: uid(),
      name: name.trim(),
      amount: a,
      frequency: freq,
      nextDueDate: new Date(dueDate).toISOString(),
      country,
      category,
      ownerName: ownerName.trim() || undefined,
      ownerType: "self",
      active: true,
      createdAt: new Date().toISOString(),
    };
    persist([...subs, sub]);
    addNotification({
      title: `Subscription added: ${sub.name}`,
      description: `${fmt(a, currency)} · ${freq} · ${country}`,
      type: "reminder",
      priority: "low",
      refType: "subscription",
      refId: sub.id,
      dedupeKey: `sub-add-${sub.id}`,
    });
    setName("");
    setAmount("");
    setOwnerName("");
    toast({ title: "Subscription saved" });
  };

  const toggle = (id: string) => {
    persist(subs.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const remove = (id: string) => {
    persist(subs.filter((s) => s.id !== id));
  };

  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => {
      if (s.frequency === "weekly") return sum + s.amount * 4.35;
      if (s.frequency === "yearly") return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Subscriptions & Fees
          </h3>
          <p className="text-sm text-muted-foreground">
            School fees, streaming, tuition — per wife/child/country
          </p>
        </div>
        <Badge variant="outline">~{fmt(monthlyTotal, currency)}/mo</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="School fee / Netflix / Tuition"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Owner (wife/child name)</Label>
              <Input
                placeholder="Optional"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Amount ({currency})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Next due</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as RecurrenceFreq)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as FamilyCountryKey)}>
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school_fee">School fee</SelectItem>
                  <SelectItem value="tuition">Tuition</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={add} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {subs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No subscriptions yet
          </p>
        )}
        {subs.map((s) => {
          const flag =
            FAMILY_COUNTRY_OPTIONS.find((c) => c.key === s.country)?.flag || "";
          return (
            <Card key={s.id} className={!s.active ? "opacity-60" : ""}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {flag} {s.name}
                    {s.ownerName ? ` · ${s.ownerName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(s.amount, currency)} · {s.frequency} · next{" "}
                    {new Date(s.nextDueDate).toLocaleDateString()} · {s.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={s.active} onCheckedChange={() => toggle(s.id)} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
