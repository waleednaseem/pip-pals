import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KanbanBoard, KanbanMember, KanbanTask } from "@/types/kanban";
import { PRIORITY_META, TYPE_META, initials, isOverdue } from "@/utils/kanban";
import { AlertTriangle } from "lucide-react";

interface KanbanListViewProps {
  board: KanbanBoard;
  tasks: KanbanTask[];
  members: KanbanMember[];
  doneColumnIds: Set<string>;
  onOpenTask: (taskId: string) => void;
}

export const KanbanListView = ({ board, tasks, members, doneColumnIds, onOpenTask }: KanbanListViewProps) => {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">No tasks match the current filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Column</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignees</TableHead>
          <TableHead>Labels</TableHead>
          <TableHead>Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => {
          const col = board.columns.find((c) => c.id === t.columnId);
          const overdue = isOverdue(t, doneColumnIds);
          const assignees = t.assigneeIds.map((id) => members.find((m) => m.id === id)).filter((m): m is KanbanMember => !!m);
          const labels = t.labelIds.map((id) => board.labels.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
          return (
            <TableRow
              key={t.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onOpenTask(t.id)}
            >
              <TableCell className="font-medium">
                <span className="mr-1.5">{TYPE_META[t.type].emoji}</span>
                {t.title}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{col?.name || "—"}</TableCell>
              <TableCell>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: PRIORITY_META[t.priority].color }}
                >
                  {PRIORITY_META[t.priority].label}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex -space-x-1.5">
                  {assignees.map((m) => (
                    <span
                      key={m.id}
                      title={m.name}
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-background"
                      style={{ backgroundColor: m.color }}
                    >
                      {initials(m.name)}
                    </span>
                  ))}
                  {assignees.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {labels.map((l) => (
                    <span
                      key={l.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${l.color}22`, color: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                {overdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
