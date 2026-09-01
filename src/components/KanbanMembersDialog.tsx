import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { KanbanMember, KanbanTask } from "@/types/kanban";
import { MEMBER_COLOR_PALETTE, nextMemberColor, initials, uid } from "@/utils/kanban";
import { useToast } from "@/hooks/use-toast";

interface KanbanMembersDialogProps {
  open: boolean;
  onClose: () => void;
  members: KanbanMember[];
  tasks: KanbanTask[];
  onChange: (members: KanbanMember[]) => void;
}

export const KanbanMembersDialog = ({ open, onClose, members, tasks, onChange }: KanbanMembersDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => nextMemberColor(members));

  const addMember = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Already exists", description: `${trimmed} is already a member.`, variant: "destructive" });
      return;
    }
    const member: KanbanMember = { id: uid(), name: trimmed, color, createdAt: new Date().toISOString() };
    onChange([...members, member]);
    setName("");
    setColor(nextMemberColor([...members, member]));
  };

  const removeMember = (id: string) => {
    const assigned = tasks.some((t) => t.assigneeIds.includes(id));
    if (assigned) {
      toast({
        title: "Cannot remove",
        description: "This member is assigned to tasks. Unassign first.",
        variant: "destructive",
      });
      return;
    }
    onChange(members.filter((m) => m.id !== id));
  };

  const updateColor = (id: string, newColor: string) => {
    onChange(members.map((m) => (m.id === id ? { ...m, color: newColor } : m)));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Add member by name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
              />
              <Button onClick={addMember} type="button" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MEMBER_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No members yet — add one above.</p>
            )}
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: m.color }}
                >
                  {initials(m.name)}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{m.name}</span>
                <div className="flex gap-1">
                  {MEMBER_COLOR_PALETTE.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateColor(m.id, c)}
                      className={`h-4 w-4 rounded-full ${m.color === c ? "ring-2 ring-offset-1 ring-foreground" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeMember(m.id)} type="button">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Members are shared across all boards. Dynamic linking with Google login will be added later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
