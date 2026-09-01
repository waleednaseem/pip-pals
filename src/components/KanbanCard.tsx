import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanBoard, KanbanMember, KanbanTask } from "@/types/kanban";
import { PRIORITY_META, TYPE_META, initials, isOverdue, isDueSoon } from "@/utils/kanban";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, CheckSquare, MessageSquare, Flame } from "lucide-react";

interface KanbanCardProps {
  task: KanbanTask;
  board: KanbanBoard;
  members: KanbanMember[];
  doneColumnIds: Set<string>;
  onClick: () => void;
}

export const KanbanCard = ({ task, board, members, doneColumnIds, onClick }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  // dnd-kit owns transform — don't mix Framer Motion here
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    scale: isDragging ? 1.02 : undefined,
    boxShadow: isDragging ? "0 12px 32px hsl(199 100% 50% / 0.18)" : undefined,
  };

  const priority = PRIORITY_META[task.priority];
  const type = TYPE_META[task.type];
  const assignees = task.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is KanbanMember => !!m);
  const labels = task.labelIds
    .map((id) => board.labels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => !!l);
  const subtaskDone = task.subtasks.filter((s) => s.done).length;
  const overdue = isOverdue(task, doneColumnIds);
  const dueSoon = isDueSoon(task, doneColumnIds);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group cursor-grab active:cursor-grabbing rounded-xl p-3 space-y-2 transition-all duration-200 ${
        overdue
          ? "border border-red-500/40 bg-[hsl(0_84%_60%/0.04)]"
          : "card-premium hover:border-[hsl(199_100%_50%/0.25)] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-0.5 h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: priority.color }}
          title={`Priority: ${priority.label}`}
        />
        <span title={type.label} className="text-xs shrink-0">
          {type.emoji}
        </span>
        <p className="text-sm font-medium leading-snug break-words flex-1 min-w-0">{task.title}</p>
      </div>

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span
              key={l.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${l.color}22`, color: l.color, border: `1px solid ${l.color}55` }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {task.subtasks.length > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CheckSquare className="h-3 w-3" />
          {subtaskDone}/{task.subtasks.length}
          <div className="flex-1 h-1 rounded-full overflow-hidden ml-1 bg-muted">
            <div
              className="h-full rounded-full bg-[hsl(var(--success))]"
              style={{ width: `${task.subtasks.length ? (subtaskDone / task.subtasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                overdue
                  ? "bg-red-500/15 text-red-500"
                  : dueSoon
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {overdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          {task.storyPoints != null && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {task.storyPoints} pt
            </Badge>
          )}
          {task.priority === "urgent" && <Flame className="h-3 w-3 text-red-500" />}
          {task.comments.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-2.5 w-2.5" />
              {task.comments.length}
            </span>
          )}
        </div>

        {assignees.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {assignees.slice(0, 3).map((m) => (
              <div
                key={m.id}
                title={m.name}
                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card"
                style={{ backgroundColor: m.color }}
              >
                {initials(m.name)}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted ring-2 ring-card">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
