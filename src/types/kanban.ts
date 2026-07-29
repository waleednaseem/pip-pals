export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskType = "task" | "bug" | "story" | "epic";
export type SortMode = "manual" | "priority" | "dueDate" | "name" | "created";
export type SortDirection = "asc" | "desc";
export type KanbanView = "board" | "list";

export interface KanbanMember {
  id: string;
  name: string;
  color: string; // hex color, e.g. "#f97316"
  role?: string;
  /** Reserved for future Google-login linkage. Unused for now. */
  linkedUserId?: string;
  createdAt: string;
}

export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface KanbanSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface KanbanComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export type KanbanActivityType =
  | "created"
  | "moved"
  | "assigned"
  | "unassigned"
  | "priority_changed"
  | "type_changed"
  | "commented"
  | "completed"
  | "reopened"
  | "edited"
  | "subtask_added"
  | "subtask_toggled"
  | "label_added"
  | "label_removed"
  | "due_date_changed";

export interface KanbanActivityEntry {
  id: string;
  type: KanbanActivityType;
  message: string;
  actorId?: string;
  createdAt: string;
}

export interface KanbanTask {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  assigneeIds: string[];
  labelIds: string[];
  subtasks: KanbanSubtask[];
  dueDate?: string; // ISO date (yyyy-mm-dd)
  startDate?: string;
  storyPoints?: number;
  order: number;
  comments: KanbanComment[];
  activity: KanbanActivityEntry[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archived?: boolean;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  name: string;
  color?: string;
  order: number;
  wipLimit?: number;
  isDoneColumn?: boolean;
}

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  icon: string; // emoji
  color: string;
  createdAt: string;
  columns: KanbanColumn[];
  labels: KanbanLabel[];
}

export interface KanbanFilters {
  search: string;
  assigneeIds: string[];
  labelIds: string[];
  priorities: TaskPriority[];
  types: TaskType[];
  viewAsMemberId: string | null;
}

export interface KanbanData {
  boards: KanbanBoard[];
  members: KanbanMember[];
  tasks: KanbanTask[];
  activeBoardId: string | null;
}
