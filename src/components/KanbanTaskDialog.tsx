import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Plus, X, MessageSquare, History as HistoryIcon, ListChecks, ChevronDown,
} from "lucide-react";
import { KanbanBoard, KanbanMember, KanbanTask, TaskPriority, TaskType } from "@/types/kanban";
import { PRIORITY_META, PRIORITY_ORDER, TYPE_META, initials, addSubtask, addComment, logActivity } from "@/utils/kanban";

interface KanbanTaskDialogProps {
  task: KanbanTask | null;
  board: KanbanBoard;
  members: KanbanMember[];
  currentMemberId: string | null;
  onClose: () => void;
  onUpdate: (taskId: string, updater: (t: KanbanTask) => KanbanTask) => void;
  onDelete: (taskId: string) => void;
}

const touch = (t: KanbanTask): KanbanTask => ({ ...t, updatedAt: new Date().toISOString() });

export const KanbanTaskDialog = ({
  task, board, members, currentMemberId, onClose, onUpdate, onDelete,
}: KanbanTaskDialogProps) => {
  const [subtaskInput, setSubtaskInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  if (!task) return null;

  const setField = <K extends keyof KanbanTask>(key: K, value: KanbanTask[K], activityMsg?: string) => {
    onUpdate(task.id, (t) => {
      const next = touch({ ...t, [key]: value });
      if (activityMsg) next.activity = [...next.activity, logActivity("edited", activityMsg, currentMemberId || undefined)];
      return next;
    });
  };

  const toggleAssignee = (memberId: string) => {
    const has = task.assigneeIds.includes(memberId);
    const name = members.find((m) => m.id === memberId)?.name || "someone";
    onUpdate(task.id, (t) => {
      const next = touch({
        ...t,
        assigneeIds: has ? t.assigneeIds.filter((id) => id !== memberId) : [...t.assigneeIds, memberId],
      });
      next.activity = [
        ...next.activity,
        logActivity(has ? "unassigned" : "assigned", has ? `Unassigned ${name}` : `Assigned to ${name}`, currentMemberId || undefined),
      ];
      return next;
    });
  };

  const toggleLabel = (labelId: string) => {
    const has = task.labelIds.includes(labelId);
    setField("labelIds", has ? task.labelIds.filter((id) => id !== labelId) : [...task.labelIds, labelId]);
  };

  const handlePriority = (p: TaskPriority) => {
    setField("priority", p, `Priority changed to ${PRIORITY_META[p].label}`);
  };

  const handleType = (ty: TaskType) => {
    setField("type", ty, `Type changed to ${TYPE_META[ty].label}`);
  };

  const handleSubtaskAdd = () => {
    if (!subtaskInput.trim()) return;
    onUpdate(task.id, (t) => {
      const next = touch({ ...t, subtasks: addSubtask(t.subtasks, subtaskInput) });
      next.activity = [...next.activity, logActivity("subtask_added", `Added subtask "${subtaskInput.trim()}"`, currentMemberId || undefined)];
      return next;
    });
    setSubtaskInput("");
  };

  const handleSubtaskToggle = (id: string) => {
    onUpdate(task.id, (t) => touch({
      ...t,
      subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    }));
  };

  const handleSubtaskRemove = (id: string) => {
    onUpdate(task.id, (t) => touch({ ...t, subtasks: t.subtasks.filter((s) => s.id !== id) }));
  };

  const handleCommentAdd = () => {
    if (!commentInput.trim() || !currentMemberId) return;
    onUpdate(task.id, (t) => {
      const next = touch({ ...t, comments: addComment(t.comments, currentMemberId, commentInput) });
      next.activity = [...next.activity, logActivity("commented", "Left a comment", currentMemberId)];
      return next;
    });
    setCommentInput("");
  };

  const author = (id: string) => members.find((m) => m.id === id);

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-start gap-2">
            <span className="text-lg mt-1">{TYPE_META[task.type].emoji}</span>
            <Input
              value={task.title}
              onChange={(e) => setField("title", e.target.value)}
              className="text-base font-semibold border-none px-0 h-auto focus-visible:ring-0 shadow-none bg-transparent"
            />
          </div>
          <DialogTitle className="sr-only">Edit task</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-5 mt-3 grid grid-cols-4">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="subtasks" className="text-xs gap-1">
              <ListChecks className="h-3 w-3" /> Subtasks {task.subtasks.length > 0 && `(${task.subtasks.length})`}
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs gap-1">
              <MessageSquare className="h-3 w-3" /> Comments {task.comments.length > 0 && `(${task.comments.length})`}
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <HistoryIcon className="h-3 w-3" /> Activity
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-5 pt-3">
            <TabsContent value="details" className="mt-0 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={task.description || ""}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Add more detail..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={task.type} onValueChange={(v: TaskType) => handleType(v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_META) as TaskType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={task.priority} onValueChange={(v: TaskPriority) => handlePriority(v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_ORDER.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: PRIORITY_META[p].color }} />
                            {PRIORITY_META[p].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due date</Label>
                  <Input
                    type="date"
                    className="mt-1 h-9"
                    value={task.dueDate || ""}
                    onChange={(e) => setField("dueDate", e.target.value || undefined, "Due date updated")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Story points</Label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1 h-9"
                    value={task.storyPoints ?? ""}
                    onChange={(e) => setField("storyPoints", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Assignees</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-between h-9" type="button">
                      <span className="flex -space-x-1.5">
                        {task.assigneeIds.length === 0 && <span className="text-sm text-muted-foreground">Unassigned</span>}
                        {task.assigneeIds.map((id) => {
                          const m = author(id);
                          if (!m) return null;
                          return (
                            <span
                              key={id}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background"
                              style={{ backgroundColor: m.color }}
                            >
                              {initials(m.name)}
                            </span>
                          );
                        })}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {members.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">No members yet — add from Members manager.</p>
                      )}
                      {members.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox checked={task.assigneeIds.includes(m.id)} onCheckedChange={() => toggleAssignee(m.id)} />
                          <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: m.color }}>
                            {initials(m.name)}
                          </span>
                          {m.name}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Labels</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-between h-9" type="button">
                      <span className="flex flex-wrap gap-1">
                        {task.labelIds.length === 0 && <span className="text-sm text-muted-foreground">No labels</span>}
                        {task.labelIds.map((id) => {
                          const l = board.labels.find((x) => x.id === id);
                          if (!l) return null;
                          return (
                            <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${l.color}22`, color: l.color }}>
                              {l.name}
                            </span>
                          );
                        })}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {board.labels.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">No labels yet — add from Board Settings.</p>
                      )}
                      {board.labels.map((l) => (
                        <label key={l.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                          <Checkbox checked={task.labelIds.includes(l.id)} onCheckedChange={() => toggleLabel(l.id)} />
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600"
                onClick={() => {
                  if (window.confirm("Delete this task?")) {
                    onDelete(task.id);
                    onClose();
                  }
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete task
              </Button>
            </TabsContent>

            <TabsContent value="subtasks" className="mt-0 space-y-2">
              {task.subtasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No subtasks yet.</p>
              )}
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border/40">
                  <Checkbox checked={s.done} onCheckedChange={() => handleSubtaskToggle(s.id)} />
                  <span className={`flex-1 text-sm ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleSubtaskRemove(s.id)} type="button">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="New subtask..."
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubtaskAdd()}
                  className="h-9"
                />
                <Button onClick={handleSubtaskAdd} size="sm" type="button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-0 space-y-3">
              {task.comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
              )}
              {task.comments.map((c) => {
                const a = author(c.authorId);
                return (
                  <div key={c.id} className="flex gap-2">
                    <span
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: a?.color || "#64748b" }}
                    >
                      {a ? initials(a.name) : "?"}
                    </span>
                    <div className="flex-1 rounded-lg bg-muted/40 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{a?.name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-0.5 break-words">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 space-y-2">
                {!currentMemberId && (
                  <p className="text-xs text-amber-600">Select "View as" member in the toolbar to comment.</p>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder={currentMemberId ? "Write a comment..." : "Select a member first..."}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCommentAdd()}
                    disabled={!currentMemberId}
                    className="h-9"
                  />
                  <Button onClick={handleCommentAdd} size="sm" disabled={!currentMemberId} type="button">
                    Post
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-2">
              {task.activity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
              )}
              {task.activity
                .slice()
                .reverse()
                .map((a) => {
                  const actor = a.actorId ? author(a.actorId) : undefined;
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                      <span
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: actor?.color || "#94a3b8" }}
                      />
                      <span className="flex-1">
                        {actor ? <strong>{actor.name}</strong> : <strong>Someone</strong>} — {a.message}
                      </span>
                      <span className="text-muted-foreground shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  );
                })}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
