import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { BOARD_TEMPLATES, MEMBER_COLOR_PALETTE } from "@/utils/kanban";

interface KanbanNewBoardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string, color: string, template: string) => void;
}

const EMOJI_OPTIONS = ["📋", "🚀", "💼", "🏠", "🎯", "🛠️", "📊", "✨", "🧩", "📦"];

export const KanbanNewBoardDialog = ({ open, onClose, onCreate }: KanbanNewBoardDialogProps) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(MEMBER_COLOR_PALETTE[1]);
  const [template, setTemplate] = useState("simple");

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name, icon, color, template);
    setName("");
    setIcon(EMOJI_OPTIONS[0]);
    setTemplate("simple");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Board name</Label>
            <Input
              autoFocus
              placeholder="e.g. Business Tasks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Icon</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center border ${
                    icon === e ? "border-primary bg-primary/10" : "border-border/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {MEMBER_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Template</Label>
            <div className="space-y-1.5 mt-1">
              {BOARD_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm ${
                    template === t.id ? "border-primary bg-primary/5" : "border-border/50"
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={submit} disabled={!name.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700" type="button">
            <Plus className="h-4 w-4 mr-1" /> Create Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
