import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { scaleIn } from "@/lib/animations";
import { KanbanBoard, KanbanColumn, KanbanMember, KanbanTask } from "@/types/kanban";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreVertical, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnViewProps {
  column: KanbanColumn;
  board: KanbanBoard;
  tasks: KanbanTask[];
  members: KanbanMember[];
  doneColumnIds: Set<string>;
  onAddTask: (columnId: string, title: string) => void;
  onOpenTask: (taskId: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleDone: (columnId: string) => void;
}

export const KanbanColumnView = ({
  column,
  board,
  tasks,
  members,
  doneColumnIds,
  onAddTask,
  onOpenTask,
  onRenameColumn,
  onDeleteColumn,
  onToggleDone,
}: KanbanColumnViewProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column", columnId: column.id } });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const overLimit = !!column.wipLimit && tasks.length > column.wipLimit;

  const submitAdd = () => {
    if (!newTitle.trim()) {
      setAdding(false);
      return;
    }
    onAddTask(column.id, newTitle);
    setNewTitle("");
  };

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-xl max-h-full"
      style={{background: "hsl(220 40% 9%)", border: "1px solid hsl(220 32% 16%)"}}>
      <div className="flex items-center justify-between gap-1 p-2.5" style={{borderBottom: "1px solid hsl(220 32% 14%)"}}>

        <div className="flex items-center gap-1.5 min-w-0">
          {column.isDoneColumn && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          <span className="font-semibold text-sm truncate">{column.name}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
              overLimit ? "badge-red" : "badge-cyan"
            }`}
          >
            {tasks.length}
            {column.wipLimit ? `/${column.wipLimit}` : ""}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                const name = window.prompt("Rename column", column.name);
                if (name && name.trim()) onRenameColumn(column.id, name.trim());
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleDone(column.id)}>
              {column.isDoneColumn ? "Unmark as Done column" : "Mark as Done column"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-500"
              onClick={() => {
                if (window.confirm(`Delete column "${column.name}"? Tasks inside will move to the first column.`)) {
                  onDeleteColumn(column.id);
                }
              }}
            >
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px] transition-colors rounded-lg ${
          isOver ? "bg-[hsl(199_100%_50%/0.04)]" : ""
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              board={board}
              members={members}
              doneColumnIds={doneColumnIds}
              onClick={() => onOpenTask(task.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
        )}
      </div>

      <div className="p-2" style={{borderTop: "1px solid hsl(220 32% 14%)"}}>
        <AnimatePresence mode="wait">
        {adding ? (
          <motion.div key="add-form" initial="hidden" animate="visible" exit="hidden" variants={scaleIn} className="space-y-1.5">
            <Input
              autoFocus
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
              className="h-8 text-sm bg-background"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 flex-1" onClick={submitAdd} type="button">
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="add-btn" initial="hidden" animate="visible" variants={scaleIn}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground h-8 hover:text-[hsl(199_100%_55%)] hover:bg-[hsl(199_100%_50%/0.08)]"
            onClick={() => setAdding(true)}
            type="button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add task
          </Button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};
