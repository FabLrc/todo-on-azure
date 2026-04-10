import { ArrowUpDown, ChevronDown, RotateCcw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { todoPriorityLabels, todoPriorityValues, todoStatusLabels, todoStatusValues } from "@/lib/types";
import type { TodoPriority, TodoStatus } from "@/lib/types";

import {
  getPriorityBadgeClass,
  getStatusBadgeClass,
  sortFieldLabels,
  type SortDirection,
  type TodoSortField,
} from "./todo-view-model";

interface TodoFilterBarProps {
  searchQuery: string;
  statusFilter: "all" | TodoStatus;
  priorityFilter: "all" | TodoPriority;
  sortField: TodoSortField;
  sortDirection: SortDirection;
  showOnlyWithDueDate: boolean;
  showOnlyOverdue: boolean;
  activeFilterCount: number;
  totalTodos: number;
  filteredTodosCount: number;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | TodoStatus) => void;
  onPriorityFilterChange: (value: "all" | TodoPriority) => void;
  onSortFieldChange: (value: TodoSortField) => void;
  onToggleSortDirection: () => void;
  onShowOnlyWithDueDateChange: (value: boolean) => void;
  onShowOnlyOverdueChange: (value: boolean) => void;
  onResetFilters: () => void;
}

export function TodoFilterBar({
  searchQuery,
  statusFilter,
  priorityFilter,
  sortField,
  sortDirection,
  showOnlyWithDueDate,
  showOnlyOverdue,
  activeFilterCount,
  totalTodos,
  filteredTodosCount,
  onSearchQueryChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSortFieldChange,
  onToggleSortDirection,
  onShowOnlyWithDueDateChange,
  onShowOnlyOverdueChange,
  onResetFilters,
}: TodoFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher une tache..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={(value) => onSortFieldChange(value as TodoSortField)}>
            <SelectTrigger className="gap-1.5">
              <ArrowUpDown className="size-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(sortFieldLabels) as [TodoSortField, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onToggleSortDirection}
            aria-label={sortDirection === "asc" ? "Tri descendant" : "Tri ascendant"}
          >
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${sortDirection === "asc" ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Statut</span>
        <button
          type="button"
          onClick={() => onStatusFilterChange("all")}
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tous
        </button>
        {todoStatusValues.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(statusFilter === status ? "all" : status)}
            className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? getStatusBadgeClass(status).replace(/hover:\S+/g, "") + " ring-1 ring-current/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {todoStatusLabels[status]}
          </button>
        ))}

        <Separator orientation="vertical" className="mx-1 h-4" />

        <span className="text-xs font-medium text-slate-500">Priorite</span>
        <button
          type="button"
          onClick={() => onPriorityFilterChange("all")}
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-colors ${
            priorityFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Toutes
        </button>
        {todoPriorityValues.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => onPriorityFilterChange(priorityFilter === priority ? "all" : priority)}
            className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-colors ${
              priorityFilter === priority
                ? getPriorityBadgeClass(priority).replace(/hover:\S+/g, "") + " ring-1 ring-current/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {todoPriorityLabels[priority]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
          <Checkbox
            checked={showOnlyWithDueDate}
            onCheckedChange={(checked) => onShowOnlyWithDueDateChange(checked === true)}
          />
          Avec echeance
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
          <Checkbox
            checked={showOnlyOverdue}
            onCheckedChange={(checked) => onShowOnlyOverdueChange(checked === true)}
          />
          En retard
        </label>

        {activeFilterCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-slate-500"
            onClick={onResetFilters}
          >
            <RotateCcw className="size-3" />
            Reinitialiser
            <Badge className="ml-0.5 bg-slate-200 text-slate-700">{activeFilterCount}</Badge>
          </Button>
        ) : null}

        <span className="ml-auto text-xs text-slate-400">
          {filteredTodosCount} / {totalTodos} taches
        </span>
      </div>
    </div>
  );
}
