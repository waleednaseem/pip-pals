import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, BellOff, Check, Trash2, AlertCircle, Calendar as CalendarIcon,
  RefreshCw, Wallet, Heart, Baby, Home as HomeIcon, Filter, CheckCheck,
} from "lucide-react";
import { AppNotification } from "@/types/family";
import { getNotifications, saveNotifications, runRecurringEngine } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onNavigate?: (target: { type: string; id?: string }) => void;
}

const typeIcon = (t: AppNotification["type"]) => {
  switch (t) {
    case "payment": return <Wallet className="h-4 w-4" />;
    case "event": return <CalendarIcon className="h-4 w-4" />;
    case "recurring": return <RefreshCw className="h-4 w-4" />;
    case "responsibility": return <AlertCircle className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
};

const refIcon = (ref?: AppNotification["refType"]) => {
  if (ref === "wife") return <Heart className="h-3 w-3 text-pink-500" />;
  if (ref === "child") return <Baby className="h-3 w-3 text-blue-500" />;
  if (ref === "household") return <HomeIcon className="h-3 w-3 text-amber-500" />;
  return null;
};

const priorityColor = (p: AppNotification["priority"]) =>
  p === "high" ? "border-[hsl(0_84%_60%/0.3)] bg-[hsl(0_84%_60%/0.04)]"
    : p === "medium" ? "border-[hsl(38_92%_60%/0.25)] bg-[hsl(38_92%_60%/0.04)]"
    : "border-border bg-muted/60";

export const Notifications = ({ onNavigate }: Props) => {
  const [list, setList] = useState<AppNotification[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | AppNotification["type"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const { toast } = useToast();

  const reload = () => setList(getNotifications());

  useEffect(() => {
    runRecurringEngine();
    reload();
  }, []);

  const persist = (next: AppNotification[]) => {
    saveNotifications(next);
    setList(next);
  };

  const markRead = (id: string) =>
    setList((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, status: "read" as const } : n));
      saveNotifications(next);
      return next;
    });
  const remove = (id: string) =>
    setList((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotifications(next);
      return next;
    });
  const markAllRead = () =>
    setList((prev) => {
      const next = prev.map((n) => ({ ...n, status: "read" as const }));
      saveNotifications(next);
      return next;
    });
  const clearAll = () => { persist([]); toast({ title: "Cleared", description: "All notifications removed" }); };

  const filtered = useMemo(() => list.filter(n =>
    (typeFilter === "all" || n.type === typeFilter) &&
    (statusFilter === "all" || n.status === statusFilter)
  ), [list, typeFilter, statusFilter]);

  const unreadCount = list.filter(n => n.status === "unread").length;

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    if (onNavigate && n.refType) onNavigate({ type: n.refType, id: n.refId });
  };

  return (
    <div className="space-y-4">
      <Card className="card-accent-top">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(199_100%_50%/0.12)] border border-[hsl(199_100%_50%/0.2)]">
                <Bell className="h-4 w-4 text-[hsl(199_100%_55%)]" />
              </div>
              <CardTitle className="text-sm flex items-center gap-2">
                Notifications
                <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    className="badge-red badge-soft-pulse"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    {unreadCount} new
                  </motion.span>
                )}
              </AnimatePresence>
              </CardTitle>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => { runRecurringEngine(); reload(); }} className="h-8 text-xs gap-1">
                <RefreshCw className="h-3 w-3" />Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0} className="h-8 text-xs gap-1">
                <CheckCheck className="h-3 w-3" />Mark all read
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-[hsl(0_84%_60%)]" onClick={clearAll} disabled={list.length === 0}>
                <Trash2 className="h-3 w-3" />Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Tabs value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <TabsList className="h-7 p-0.5 rounded-lg bg-muted border border-border">
                  {["all", "payment", "event", "recurring", "reminder"].map(v => (
                    <TabsTrigger key={v} value={v} className="text-[10px] h-5 px-2 rounded-md capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary">{v}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <TabsList className="h-7 p-0.5 rounded-lg bg-muted border border-border">
                {["all", "unread", "read"].map(v => (
                  <TabsTrigger key={v} value={v} className="text-[10px] h-5 px-2 rounded-md capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary">{v}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-200 hover:brightness-110 ${priorityColor(n.priority)} ${n.status === "unread" ? "font-medium" : "opacity-60"}`}
                >
                  <div className="mt-0.5 text-primary">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {refIcon(n.refType)}
                      <span className="text-sm break-words">{n.title}</span>
                      {n.status === "unread" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground break-words mt-0.5">{n.description}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-[9px] capitalize">{n.type}</Badge>
                      <Badge variant="outline" className={`text-[9px] capitalize ${
                        n.priority === "high" ? "text-red-500 border-red-500/50"
                          : n.priority === "medium" ? "text-amber-500 border-amber-500/50"
                          : ""
                      }`}>{n.priority}</Badge>
                      {n.dueDate && <span>· Due {new Date(n.dueDate).toLocaleDateString()}</span>}
                      <span>· {new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {n.status === "unread" && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500"
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500"
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
