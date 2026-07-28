import { useState, useEffect, useMemo } from "react";
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
  p === "high" ? "border-red-500/40 bg-red-500/5"
    : p === "medium" ? "border-amber-500/30 bg-amber-500/5"
    : "border-border/40";

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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-[10px]">{unreadCount} new</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { runRecurringEngine(); reload(); }}>
                <RefreshCw className="h-3 w-3 mr-1" />Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
                <CheckCheck className="h-3 w-3 mr-1" />Mark all read
              </Button>
              <Button size="sm" variant="outline" className="text-red-500" onClick={clearAll} disabled={list.length === 0}>
                <Trash2 className="h-3 w-3 mr-1" />Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Tabs value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <TabsList className="h-7">
                  <TabsTrigger value="all" className="text-xs h-5 px-2">All</TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs h-5 px-2">Payments</TabsTrigger>
                  <TabsTrigger value="event" className="text-xs h-5 px-2">Events</TabsTrigger>
                  <TabsTrigger value="recurring" className="text-xs h-5 px-2">Recurring</TabsTrigger>
                  <TabsTrigger value="reminder" className="text-xs h-5 px-2">Reminders</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-xs h-5 px-2">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs h-5 px-2">Unread</TabsTrigger>
                <TabsTrigger value="read" className="text-xs h-5 px-2">Read</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-muted/40 transition-colors ${priorityColor(n.priority)} ${n.status === "unread" ? "font-medium" : "opacity-70"}`}
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
