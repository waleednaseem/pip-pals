import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, closestCorners, useSensor, useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Users, Settings, Download, ChevronDown, LayoutGrid, AlertTriangle,
} from "lucide-react";
import { KanbanData, KanbanFilters, KanbanTask, SortDirection, SortMode, KanbanView } from "@/types/kanban";
import {
  getKanbanData, saveKanbanData, createBoard, createEmptyTask, sortTasks, filterTasks,
  countOverdue, logActivity, exportBoardCSV,
} from "@/utils/kanban";
import { KanbanColumnView } from "./KanbanColumnView";
import { KanbanCard } from "./KanbanCard";
import { KanbanTaskDialog } from "./KanbanTaskDialog";
import { KanbanFilterBar } from "./KanbanFilterBar";
import { KanbanMembersDialog } from "./KanbanMembersDialog";
import { KanbanBoardSettingsDialog } from "./KanbanBoardSettingsDialog";
import { KanbanNewBoardDialog } from "./KanbanNewBoardDialog";
import { KanbanListView } from "./KanbanListView";
import { useToast } from "@/hooks/use-toast";

const emptyFilters: KanbanFilters = {
  search: "", assigneeIds: [], labelIds: [], priorities: [], types: [], viewAsMemberId: null,
};

export const KanbanBoard = () => {
  const { toast } = useToast();
  const [data, setData] = useState<KanbanData>(() => getKanbanData());
  const [showNewBoard, setShowNewBoard] = useState(data.boards.length === 0);
  const [showMembers, setShowMembers] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [filters, setFilters] = useState<KanbanFilters>(emptyFilters);
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [view, setView] = useState<KanbanView>("board");

  useEffect(() => {
    saveKanbanData(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const board = data.boards.find((b) => b.id === data.activeBoardId) || data.boards[0];

  const updateBoard = (patch: Partial<typeof board>) => {
    if (!board) return;
    setData((d) => ({ ...d, boards: d.boards.map((b) => (b.id === board.id ? { ...b, ...patch } : b)) }));
  };

  const switchBoard = (id: string) => {
    setData((d) => ({ ...d, activeBoardId: id }));
    setFilters(emptyFilters);
    setSortMode("manual");
  };

  const createNewBoard = (name: string, icon: string, color: string, template: string) => {
    const nb = createBoard(name, icon, color, template);
    setData((d) => ({ ...d, boards: [...d.boards, nb], activeBoardId: nb.id }));
    setShowNewBoard(false);
    setFilters(emptyFilters);
    toast({ title: "Board created", description: nb.name });
  };

  const deleteBoard = () => {
    if (!board) return;
    setData((d) => {
      const remaining = d.boards.filter((b) => b.id !== board.id);
      return {
        ...d,
        boards: remaining,
        tasks: d.tasks.filter((t) => t.boardId !== board.id),
        activeBoardId: remaining[0]?.id || null,
      };
    });
    setShowBoardSettings(false);
    if (data.boards.length <= 1) setShowNewBoard(true);
  };

  const doneColumnIds = useMemo(
    () => new Set((board?.columns || []).filter((c) => c.isDoneColumn).map((c) => c.id)),
    [board]
  );

  const boardTasks = useMemo(
    () => (board ? data.tasks.filter((t) => t.boardId === board.id) : []),
    [data.tasks, board]
  );

  const filteredTasks = useMemo(() => filterTasks(boardTasks, filters), [boardTasks, filters]);

  const overdueCount = useMemo(() => countOverdue(data), [data]);

  const currentMemberId = filters.viewAsMemberId;

  const columnsSorted = useMemo(
    () => (board ? [...board.columns].sort((a, b) => a.order - b.order) : []),
    [board]
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, KanbanTask[]>();
    columnsSorted.forEach((c) => {
      const inCol = filteredTasks.filter((t) => t.columnId === c.id);
      map.set(c.id, sortTasks(inCol, sortMode, sortDirection));
    });
    return map;
  }, [columnsSorted, filteredTasks, sortMode, sortDirection]);

  const updateTask = (taskId: string, updater: (t: KanbanTask) => KanbanTask) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === taskId ? updater(t) : t)) }));
  };

  const deleteTask = (taskId: string) => {
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== taskId) }));
  };

  const addTask = (columnId: string, title: string) => {
    if (!board) return;
    const existing = data.tasks.filter((t) => t.boardId === board.id && t.columnId === columnId);
    const task = createEmptyTask(board.id, columnId, title, existing.length);
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
  };

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !board) return;

    const activeTask = data.tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overIsColumn = board.columns.some((c) => c.id === over.id);
    const overTask = !overIsColumn ? data.tasks.find((t) => t.id === over.id) : undefined;
    const targetColumnId = overIsColumn ? String(over.id) : overTask?.columnId;
    if (!targetColumnId) return;

    const sourceColumnId = activeTask.columnId;
    if (sourceColumnId === targetColumnId && overTask?.id === activeTask.id) return;

    setData((prev) => {
      let tasks = [...prev.tasks];

      const targetTasksBefore = tasks
        .filter((t) => t.boardId === board.id && t.columnId === targetColumnId && t.id !== activeTask.id)
        .sort((a, b) => a.order - b.order);

      let insertIndex = targetTasksBefore.length;
      if (overTask && overTask.id !== activeTask.id) {
        const idx = targetTasksBefore.findIndex((t) => t.id === overTask.id);
        if (idx !== -1) insertIndex = idx;
      }

      const movedTask: KanbanTask = { ...activeTask, columnId: targetColumnId, updatedAt: new Date().toISOString() };

      if (sourceColumnId !== targetColumnId) {
        const targetCol = board.columns.find((c) => c.id === targetColumnId);
        const sourceCol = board.columns.find((c) => c.id === sourceColumnId);
        if (targetCol?.isDoneColumn && !movedTask.completedAt) {
          movedTask.completedAt = new Date().toISOString();
        } else if (!targetCol?.isDoneColumn) {
          movedTask.completedAt = undefined;
        }
        movedTask.activity = [
          ...movedTask.activity,
          logActivity("moved", `Moved from "${sourceCol?.name || "?"}" to "${targetCol?.name || "?"}"`, currentMemberId || undefined),
        ];
      }

      targetTasksBefore.splice(insertIndex, 0, movedTask);
      const reindexedTarget = targetTasksBefore.map((t, i) => ({ ...t, order: i }));

      tasks = tasks.filter((t) => !(t.boardId === board.id && t.columnId === targetColumnId) && t.id !== activeTask.id);
      tasks = [...tasks, ...reindexedTarget];

      if (sourceColumnId !== targetColumnId) {
        const sourceTasks = tasks
          .filter((t) => t.boardId === board.id && t.columnId === sourceColumnId)
          .sort((a, b) => a.order - b.order)
          .map((t, i) => ({ ...t, order: i }));
        tasks = tasks.filter((t) => !(t.boardId === board.id && t.columnId === sourceColumnId)).concat(sourceTasks);
      }

      return { ...prev, tasks };
    });
  };

  const exportCSV = () => {
    if (!board) return;
    const csv = exportBoardCSV(board, data.tasks, data.members);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board.name.replace(/\s+/g, "_")}_tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openTask = data.tasks.find((t) => t.id === openTaskId) || null;
  const activeDragTask = activeDragId ? data.tasks.find((t) => t.id === activeDragId) : null;

  if (!board) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Card className="card-accent-top">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{background: "hsl(199 100% 50% / 0.12)", border: "1px solid hsl(199 100% 50% / 0.2)"}}>
              <LayoutGrid className="h-7 w-7 text-[hsl(199_100%_55%)]" />
            </div>
            <h3 className="font-semibold text-base gradient-text-mixed">No boards yet</h3>
            <p className="text-sm text-[hsl(215_20%_45%)]">Create your first Kanban board to start managing tasks.</p>
            <Button onClick={() => setShowNewBoard(true)} type="button" className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Board
            </Button>
          </CardContent>
        </Card>
        <KanbanNewBoardDialog open={showNewBoard} onClose={() => setShowNewBoard(false)} onCreate={createNewBoard} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2" type="button">
              <span style={{ color: board.color }} className="text-lg leading-none">{board.icon}</span>
              <span className="font-semibold">{board.name}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {data.boards.map((b) => (
              <DropdownMenuItem key={b.id} onClick={() => switchBoard(b.id)} className="gap-2">
                <span>{b.icon}</span>
                {b.name}
                {b.id === board.id && <span className="ml-auto text-primary text-xs">●</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setShowNewBoard(true)} className="gap-2 text-primary">
              <Plus className="h-4 w-4" /> New board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {overdueCount > 0 && (
          <span className="badge-red inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} overdue
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowMembers(true)} type="button">
            <Users className="h-3.5 w-3.5" /> Members
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowBoardSettings(true)} type="button">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={exportCSV} title="Export CSV" type="button">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <KanbanFilterBar
        board={board}
        members={data.members}
        filters={filters}
        onFiltersChange={setFilters}
        sortMode={sortMode}
        sortDirection={sortDirection}
        onSortChange={(m, d) => { setSortMode(m); setSortDirection(d); }}
        view={view}
        onViewChange={setView}
      />

      {view === "board" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: "60vh" }}>
            {columnsSorted.map((col) => (
              <KanbanColumnView
                key={col.id}
                column={col}
                board={board}
                tasks={tasksByColumn.get(col.id) || []}
                members={data.members}
                doneColumnIds={doneColumnIds}
                onAddTask={addTask}
                onOpenTask={setOpenTaskId}
                onRenameColumn={(id, name) => updateBoard({ columns: board.columns.map((c) => (c.id === id ? { ...c, name } : c)) })}
                onDeleteColumn={(id) => {
                  const remaining = board.columns.filter((c) => c.id !== id);
                  if (remaining.length === 0) {
                    toast({ title: "Cannot delete", description: "Board needs at least 1 column.", variant: "destructive" });
                    return;
                  }
                  const fallback = remaining[0].id;
                  setData((d) => ({
                    ...d,
                    tasks: d.tasks.map((t) => (t.boardId === board.id && t.columnId === id ? { ...t, columnId: fallback } : t)),
                  }));
                  updateBoard({ columns: remaining.map((c, i) => ({ ...c, order: i })) });
                }}
                onToggleDone={(id) => updateBoard({ columns: board.columns.map((c) => (c.id === id ? { ...c, isDoneColumn: !c.isDoneColumn } : c)) })}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragTask ? (
              <div className="rotate-2 opacity-90">
                <KanbanCard task={activeDragTask} board={board} members={data.members} doneColumnIds={doneColumnIds} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <KanbanListView
          board={board}
          tasks={sortTasks(
            filteredTasks,
            sortMode,
            sortDirection,
            Object.fromEntries(columnsSorted.map((c) => [c.id, c.order]))
          )}
          members={data.members}
          doneColumnIds={doneColumnIds}
          onOpenTask={setOpenTaskId}
        />
      )}

      <KanbanTaskDialog
        task={openTask}
        board={board}
        members={data.members}
        currentMemberId={currentMemberId}
        onClose={() => setOpenTaskId(null)}
        onUpdate={updateTask}
        onDelete={deleteTask}
      />

      <KanbanMembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={data.members}
        tasks={data.tasks}
        onChange={(members) => setData((d) => ({ ...d, members }))}
      />

      <KanbanBoardSettingsDialog
        open={showBoardSettings}
        onClose={() => setShowBoardSettings(false)}
        board={board}
        onUpdate={updateBoard}
        onDeleteBoard={deleteBoard}
      />

      <KanbanNewBoardDialog open={showNewBoard} onClose={() => setShowNewBoard(false)} onCreate={createNewBoard} />
    </div>
  );
};

export default KanbanBoard;
