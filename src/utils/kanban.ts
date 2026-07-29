import {
  KanbanData, KanbanBoard, KanbanColumn, KanbanTask, KanbanMember, KanbanLabel,
  TaskPriority, TaskType, SortMode, SortDirection, KanbanFilters, KanbanActivityEntry,
  KanbanActivityType, KanbanSubtask, KanbanComment,
} from "@/types/kanban";

const STORAGE_KEY = "kanban-data-v1";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---------- Metadata (priority / type) ----------

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; order: number }> = {
  urgent: { label: "Urgent", color: "#ef4444", order: 4 },
  high: { label: "High", color: "#f97316", order: 3 },
  medium: { label: "Medium", color: "#eab308", order: 2 },
  low: { label: "Low", color: "#64748b", order: 1 },
};

export const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];

export const TYPE_META: Record<TaskType, { label: string; color: string; emoji: string }> = {
  task: { label: "Task", color: "#3b82f6", emoji: "✅" },
  bug: { label: "Bug", color: "#ef4444", emoji: "🐞" },
  story: { label: "Story", color: "#22c55e", emoji: "📗" },
  epic: { label: "Epic", color: "#a855f7", emoji: "⚡" },
};

export const MEMBER_COLOR_PALETTE = [
  "#f97316", "#3b82f6", "#22c55e", "#ec4899", "#a855f7", "#eab308",
  "#06b6d4", "#ef4444", "#14b8a6", "#8b5cf6", "#f43f5e", "#84cc16",
];

export const nextMemberColor = (existing: KanbanMember[]): string => {
  const used = new Set(existing.map((m) => m.color));
  const free = MEMBER_COLOR_PALETTE.find((c) => !used.has(c));
  return free || MEMBER_COLOR_PALETTE[existing.length % MEMBER_COLOR_PALETTE.length];
};

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

// ---------- Board templates ----------

const buildColumns = (boardId: string, names: string[], doneIndex: number): KanbanColumn[] =>
  names.map((name, i) => ({
    id: uid(),
    boardId,
    name,
    order: i,
    isDoneColumn: i === doneIndex,
  }));

export const BOARD_TEMPLATES: { id: string; label: string; description: string }[] = [
  { id: "simple", label: "Simple", description: "To Do, In Progress, Done" },
  { id: "software", label: "Software", description: "Backlog, To Do, In Progress, In Review, Done" },
  { id: "blank", label: "Blank", description: "Start with a single column" },
];

export const createBoard = (
  name: string,
  icon: string,
  color: string,
  template: string
): KanbanBoard => {
  const boardId = uid();
  let columns: KanbanColumn[];
  switch (template) {
    case "software":
      columns = buildColumns(boardId, ["Backlog", "To Do", "In Progress", "In Review", "Done"], 4);
      break;
    case "blank":
      columns = buildColumns(boardId, ["To Do"], -1);
      break;
    default:
      columns = buildColumns(boardId, ["To Do", "In Progress", "Done"], 2);
  }
  return {
    id: boardId,
    name: name.trim() || "Untitled Board",
    icon: icon || "📋",
    color: color || "#3b82f6",
    createdAt: new Date().toISOString(),
    columns,
    labels: [],
  };
};

// ---------- Storage ----------

const emptyData: KanbanData = { boards: [], members: [], tasks: [], activeBoardId: null };

const normalizeTask = (t: Partial<KanbanTask>, fallbackBoardId: string, fallbackColumnId: string): KanbanTask => ({
  id: typeof t.id === "string" ? t.id : uid(),
  boardId: typeof t.boardId === "string" ? t.boardId : fallbackBoardId,
  columnId: typeof t.columnId === "string" ? t.columnId : fallbackColumnId,
  title: typeof t.title === "string" ? t.title : "Untitled task",
  description: typeof t.description === "string" ? t.description : undefined,
  type: t.type && t.type in TYPE_META ? t.type : "task",
  priority: t.priority && t.priority in PRIORITY_META ? t.priority : "medium",
  assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds.filter((x) => typeof x === "string") : [],
  labelIds: Array.isArray(t.labelIds) ? t.labelIds.filter((x) => typeof x === "string") : [],
  subtasks: Array.isArray(t.subtasks)
    ? t.subtasks
        .filter((s) => s && typeof s.id === "string" && typeof s.title === "string")
        .map((s) => ({ id: s.id, title: s.title, done: !!s.done }))
    : [],
  dueDate: typeof t.dueDate === "string" ? t.dueDate : undefined,
  startDate: typeof t.startDate === "string" ? t.startDate : undefined,
  storyPoints: typeof t.storyPoints === "number" ? t.storyPoints : undefined,
  order: typeof t.order === "number" ? t.order : 0,
  comments: Array.isArray(t.comments)
    ? t.comments.filter((c) => c && typeof c.id === "string" && typeof c.text === "string")
    : [],
  activity: Array.isArray(t.activity)
    ? t.activity.filter((a) => a && typeof a.id === "string" && typeof a.message === "string")
    : [],
  createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
  updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : new Date().toISOString(),
  completedAt: typeof t.completedAt === "string" ? t.completedAt : undefined,
  archived: !!t.archived,
});

const normalizeColumn = (c: Partial<KanbanColumn>, boardId: string, index: number): KanbanColumn => ({
  id: typeof c.id === "string" ? c.id : uid(),
  boardId,
  name: typeof c.name === "string" && c.name.trim() ? c.name : `Column ${index + 1}`,
  color: typeof c.color === "string" ? c.color : undefined,
  order: typeof c.order === "number" ? c.order : index,
  wipLimit: typeof c.wipLimit === "number" && c.wipLimit > 0 ? c.wipLimit : undefined,
  isDoneColumn: !!c.isDoneColumn,
});

const normalizeLabel = (l: Partial<KanbanLabel>): KanbanLabel => ({
  id: typeof l.id === "string" ? l.id : uid(),
  name: typeof l.name === "string" ? l.name : "Label",
  color: typeof l.color === "string" ? l.color : "#64748b",
});

const normalizeBoard = (b: Partial<KanbanBoard>): KanbanBoard => {
  const boardId = typeof b.id === "string" ? b.id : uid();
  const columns = Array.isArray(b.columns) && b.columns.length > 0
    ? b.columns.map((c, i) => normalizeColumn(c || {}, boardId, i))
    : buildColumns(boardId, ["To Do", "In Progress", "Done"], 2);
  return {
    id: boardId,
    name: typeof b.name === "string" && b.name.trim() ? b.name : "Untitled Board",
    description: typeof b.description === "string" ? b.description : undefined,
    icon: typeof b.icon === "string" && b.icon ? b.icon : "📋",
    color: typeof b.color === "string" && b.color ? b.color : "#3b82f6",
    createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
    columns,
    labels: Array.isArray(b.labels) ? b.labels.map(normalizeLabel) : [],
  };
};

const normalizeMember = (m: Partial<KanbanMember>, existing: KanbanMember[]): KanbanMember => ({
  id: typeof m.id === "string" ? m.id : uid(),
  name: typeof m.name === "string" && m.name.trim() ? m.name : "Unnamed",
  color: typeof m.color === "string" && m.color ? m.color : nextMemberColor(existing),
  role: typeof m.role === "string" ? m.role : undefined,
  linkedUserId: typeof m.linkedUserId === "string" ? m.linkedUserId : undefined,
  createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
});

export const getKanbanData = (): KanbanData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyData };
    const parsed = JSON.parse(raw) as Partial<KanbanData>;

    const boards = Array.isArray(parsed.boards) ? parsed.boards.map(normalizeBoard) : [];
    const validBoardIds = new Set(boards.map((b) => b.id));

    const members: KanbanMember[] = [];
    if (Array.isArray(parsed.members)) {
      parsed.members.forEach((m) => members.push(normalizeMember(m || {}, members)));
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .map((t) => {
            const board = boards.find((b) => b.id === t?.boardId) || boards[0];
            if (!board) return null;
            const column = board.columns.find((c) => c.id === t?.columnId) || board.columns[0];
            return normalizeTask(t || {}, board.id, column?.id || "");
          })
          .filter((t): t is KanbanTask => !!t && validBoardIds.has(t.boardId))
      : [];

    const activeBoardId =
      typeof parsed.activeBoardId === "string" && validBoardIds.has(parsed.activeBoardId)
        ? parsed.activeBoardId
        : boards[0]?.id || null;

    return { boards, members, tasks, activeBoardId };
  } catch {
    return { ...emptyData };
  }
};

export const saveKanbanData = (data: KanbanData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// ---------- Activity logging ----------

export const logActivity = (
  type: KanbanActivityType,
  message: string,
  actorId?: string
): KanbanActivityEntry => ({
  id: uid(),
  type,
  message,
  actorId,
  createdAt: new Date().toISOString(),
});

// ---------- Sorting & filtering ----------

export const sortTasks = (
  tasks: KanbanTask[],
  mode: SortMode,
  direction: SortDirection,
  columnOrderMap?: Record<string, number>
): KanbanTask[] => {
  const list = [...tasks];
  const dir = direction === "asc" ? 1 : -1;

  switch (mode) {
    case "priority":
      list.sort((a, b) => (PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order) * -dir);
      break;
    case "dueDate":
      list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
      });
      break;
    case "name":
      list.sort((a, b) => a.title.localeCompare(b.title) * dir);
      break;
    case "created":
      list.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir);
      break;
    case "manual":
    default:
      if (columnOrderMap) {
        list.sort((a, b) => {
          const colDiff = (columnOrderMap[a.columnId] ?? 0) - (columnOrderMap[b.columnId] ?? 0);
          if (colDiff !== 0) return colDiff;
          return (a.order - b.order) * dir;
        });
      } else {
        list.sort((a, b) => (a.order - b.order) * dir);
      }
      break;
  }
  return list;
};

export const filterTasks = (tasks: KanbanTask[], filters: KanbanFilters): KanbanTask[] => {
  const q = filters.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (t.archived) return false;
    if (q && !`${t.title} ${t.description || ""}`.toLowerCase().includes(q)) return false;
    if (filters.assigneeIds.length > 0 && !t.assigneeIds.some((id) => filters.assigneeIds.includes(id)))
      return false;
    if (filters.labelIds.length > 0 && !t.labelIds.some((id) => filters.labelIds.includes(id))) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
    if (filters.types.length > 0 && !filters.types.includes(t.type)) return false;
    if (filters.viewAsMemberId && !t.assigneeIds.includes(filters.viewAsMemberId)) return false;
    return true;
  });
};

export const isOverdue = (task: KanbanTask, doneColumnIds: Set<string>): boolean => {
  if (!task.dueDate || doneColumnIds.has(task.columnId)) return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

export const isDueSoon = (task: KanbanTask, doneColumnIds: Set<string>): boolean => {
  if (!task.dueDate || doneColumnIds.has(task.columnId)) return false;
  const due = new Date(task.dueDate);
  const diffDays = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 2;
};

export const countOverdue = (data: KanbanData): number => {
  let count = 0;
  data.boards.forEach((board) => {
    const doneIds = new Set(board.columns.filter((c) => c.isDoneColumn).map((c) => c.id));
    data.tasks
      .filter((t) => t.boardId === board.id)
      .forEach((t) => {
        if (isOverdue(t, doneIds)) count++;
      });
  });
  return count;
};

export const reindexColumn = (tasks: KanbanTask[], boardId: string, columnId: string): KanbanTask[] =>
  tasks.map((t) => {
    if (t.boardId !== boardId || t.columnId !== columnId) return t;
    return t;
  });

export const createEmptyTask = (
  boardId: string,
  columnId: string,
  title: string,
  order: number
): KanbanTask => {
  const now = new Date().toISOString();
  return {
    id: uid(),
    boardId,
    columnId,
    title: title.trim() || "Untitled task",
    type: "task",
    priority: "medium",
    assigneeIds: [],
    labelIds: [],
    subtasks: [],
    order,
    comments: [],
    activity: [logActivity("created", "Task created")],
    createdAt: now,
    updatedAt: now,
  };
};

export const addSubtask = (subtasks: KanbanSubtask[], title: string): KanbanSubtask[] => [
  ...subtasks,
  { id: uid(), title: title.trim(), done: false },
];

export const addComment = (comments: KanbanComment[], authorId: string, text: string): KanbanComment[] => [
  ...comments,
  { id: uid(), authorId, text: text.trim(), createdAt: new Date().toISOString() },
];

export const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;

export const exportBoardCSV = (
  board: KanbanBoard,
  tasks: KanbanTask[],
  members: KanbanMember[]
): string => {
  const header = ["Title", "Column", "Type", "Priority", "Assignees", "Labels", "Due Date", "Story Points", "Created"];
  const rows = tasks
    .filter((t) => t.boardId === board.id && !t.archived)
    .map((t) => {
      const col = board.columns.find((c) => c.id === t.columnId)?.name || "";
      const assignees = t.assigneeIds
        .map((id) => members.find((m) => m.id === id)?.name)
        .filter(Boolean)
        .join("; ");
      const labels = t.labelIds
        .map((id) => board.labels.find((l) => l.id === id)?.name)
        .filter(Boolean)
        .join("; ");
      return [
        t.title,
        col,
        TYPE_META[t.type].label,
        PRIORITY_META[t.priority].label,
        assignees,
        labels,
        t.dueDate || "",
        t.storyPoints?.toString() || "",
        new Date(t.createdAt).toLocaleDateString(),
      ]
        .map(csvEscape)
        .join(",");
    });
  return [header.map(csvEscape).join(","), ...rows].join("\n");
};
