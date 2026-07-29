import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search, Filter, ArrowUpDown, LayoutGrid, List, X, User,
} from "lucide-react";
import { KanbanBoard, KanbanFilters, KanbanMember, SortDirection, SortMode, KanbanView } from "@/types/kanban";
import { PRIORITY_META, PRIORITY_ORDER, TYPE_META, initials } from "@/utils/kanban";

interface KanbanFilterBarProps {
  board: KanbanBoard;
  members: KanbanMember[];
  filters: KanbanFilters;
  onFiltersChange: (f: KanbanFilters) => void;
  sortMode: SortMode;
  sortDirection: SortDirection;
  onSortChange: (mode: SortMode, dir: SortDirection) => void;
  view: KanbanView;
  onViewChange: (v: KanbanView) => void;
}

const SORT_LABELS: Record<SortMode, string> = {
  manual: "Manual (drag order)",
  priority: "Priority",
  dueDate: "Due date",
  name: "Name",
  created: "Created date",
};

export const KanbanFilterBar = ({
  board, members, filters, onFiltersChange, sortMode, sortDirection, onSortChange, view, onViewChange,
}: KanbanFilterBarProps) => {
  const activeFilterCount =
    filters.assigneeIds.length + filters.labelIds.length + filters.priorities.length + filters.types.length;

  const toggleIn = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-9 pl-8"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button">
            <Filter className="h-3.5 w-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="h-4 px-1.5 text-[10px]">{activeFilterCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start">
          <div>
            <p className="text-xs font-semibold mb-1.5">Assignee</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {members.length === 0 && <p className="text-xs text-muted-foreground">No members yet.</p>}
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.assigneeIds.includes(m.id)}
                    onCheckedChange={() => onFiltersChange({ ...filters, assigneeIds: toggleIn(filters.assigneeIds, m.id) })}
                  />
                  <span className="h-4 w-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>
                    {initials(m.name)}
                  </span>
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1.5">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, priorities: toggleIn(filters.priorities, p) as typeof filters.priorities })}
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    filters.priorities.includes(p) ? "text-white" : "text-foreground bg-background"
                  }`}
                  style={filters.priorities.includes(p) ? { backgroundColor: PRIORITY_META[p].color, borderColor: PRIORITY_META[p].color } : {}}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1.5">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, types: toggleIn(filters.types, t) as typeof filters.types })}
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    filters.types.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                  }`}
                >
                  {TYPE_META[t].emoji} {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>
          {board.labels.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1.5">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {board.labels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, labelIds: toggleIn(filters.labelIds, l.id) })}
                    className="text-[11px] px-2 py-0.5 rounded-full border"
                    style={
                      filters.labelIds.includes(l.id)
                        ? { backgroundColor: l.color, color: "#fff", borderColor: l.color }
                        : { color: l.color, borderColor: `${l.color}55` }
                    }
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onFiltersChange({ ...filters, assigneeIds: [], labelIds: [], priorities: [], types: [] })}
              type="button"
            >
              <X className="h-3 w-3 mr-1" /> Clear filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Select
        value={filters.viewAsMemberId || "none"}
        onValueChange={(v) => onFiltersChange({ ...filters, viewAsMemberId: v === "none" ? null : v })}
      >
        <SelectTrigger className="h-9 w-[150px] gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" />
          <SelectValue placeholder="View as" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Everyone</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Select value={sortMode} onValueChange={(v: SortMode) => onSortChange(v, sortDirection)}>
          <SelectTrigger className="h-9 w-[160px] gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <SelectItem key={m} value={m}>{SORT_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sortMode !== "manual" && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onSortChange(sortMode, sortDirection === "asc" ? "desc" : "asc")}
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
            type="button"
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </Button>
        )}
      </div>

      <div className="flex rounded-lg border border-border/50 overflow-hidden">
        <Button
          variant={view === "board" ? "default" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => onViewChange("board")}
          type="button"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => onViewChange("list")}
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
