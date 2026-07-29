import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, Trash2, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { KanbanBoard, KanbanColumn, KanbanLabel } from "@/types/kanban";
import { MEMBER_COLOR_PALETTE, uid } from "@/utils/kanban";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  board: KanbanBoard;
  onUpdate: (patch: Partial<KanbanBoard>) => void;
  onDeleteBoard: () => void;
}

export const KanbanBoardSettingsDialog = ({
  open, onClose, board, onUpdate, onDeleteBoard,
}: KanbanBoardSettingsDialogProps) => {
  const { toast } = useToast();
  const [colName, setColName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(MEMBER_COLOR_PALETTE[0]);
  const [boardName, setBoardName] = useState(board.name);

  const columns = [...board.columns].sort((a, b) => a.order - b.order);

  const saveColumns = (next: KanbanColumn[]) => onUpdate({ columns: next });

  const addColumn = () => {
    if (!colName.trim()) return;
    const col: KanbanColumn = {
      id: uid(),
      boardId: board.id,
      name: colName.trim(),
      order: columns.length,
    };
    saveColumns([...columns, col]);
    setColName("");
  };

  const removeColumn = (id: string) => {
    if (columns.length <= 1) {
      toast({ title: "Cannot remove", description: "Board needs at least 1 column.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Delete this column? Tasks inside move to the first remaining column.")) return;
    saveColumns(columns.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })));
  };

  const renameColumn = (id: string, name: string) => {
    saveColumns(columns.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const setWipLimit = (id: string, limit: string) => {
    const n = limit ? Number(limit) : undefined;
    saveColumns(columns.map((c) => (c.id === id ? { ...c, wipLimit: n && n > 0 ? n : undefined } : c)));
  };

  const toggleDone = (id: string) => {
    saveColumns(columns.map((c) => (c.id === id ? { ...c, isDoneColumn: !c.isDoneColumn } : c)));
  };

  const moveColumn = (id: string, dir: -1 | 1) => {
    const idx = columns.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    saveColumns(next.map((c, i) => ({ ...c, order: i })));
  };

  const addLabel = () => {
    if (!labelName.trim()) return;
    const label: KanbanLabel = { id: uid(), name: labelName.trim(), color: labelColor };
    onUpdate({ labels: [...board.labels, label] });
    setLabelName("");
  };

  const removeLabel = (id: string) => {
    onUpdate({ labels: board.labels.filter((l) => l.id !== id) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Board Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="columns">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-2 mt-3">
            {columns.map((c, i) => (
              <div key={c.id} className="p-2 rounded-lg border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => renameColumn(c.id, e.target.value)}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) renameColumn(c.id, `Column ${i + 1}`);
                    }}
                    className="h-8 flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumn(c.id, -1)} disabled={i === 0} type="button">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumn(c.id, 1)} disabled={i === columns.length - 1} type="button">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeColumn(c.id)} type="button">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <Checkbox checked={!!c.isDoneColumn} onCheckedChange={() => toggleDone(c.id)} />
                    Done column
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">WIP limit</span>
                    <Input
                      type="number"
                      min="0"
                      className="h-7 w-16"
                      value={c.wipLimit ?? ""}
                      onChange={(e) => setWipLimit(c.id, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="New column name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
                className="h-9"
              />
              <Button onClick={addColumn} type="button" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="labels" className="space-y-2 mt-3">
            {board.labels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No labels yet.</p>
            )}
            {board.labels.map((l) => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                <span className="flex-1 text-sm truncate">{l.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeLabel(l.id)} type="button">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="New label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLabel()}
                  className="h-9"
                />
                <Button onClick={addLabel} type="button" size="sm">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLabelColor(c)}
                    className={`h-5 w-5 rounded-full ${labelColor === c ? "ring-2 ring-offset-1 ring-foreground" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Board name</Label>
              <div className="flex gap-2 mt-1">
                <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} className="h-9" />
                <Button
                  size="sm"
                  onClick={() => boardName.trim() && onUpdate({ name: boardName.trim() })}
                  type="button"
                >
                  Save
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-500 hover:text-red-600"
              onClick={() => {
                if (window.confirm(`Delete board "${board.name}" and all its tasks? This cannot be undone.`)) {
                  onDeleteBoard();
                }
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete this board
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
