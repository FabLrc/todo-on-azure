"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpDown,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";
import {
  todoPriorityLabels,
  todoPriorityValues,
  todoStatusLabels,
  todoStatusValues,
  type TodoItem,
  type TodoPriority,
  type TodoStatus,
} from "@/lib/types";

type TodoSortField = "createdAt" | "updatedAt" | "dueDate" | "priority" | "title" | "status";
type SortDirection = "asc" | "desc";

const priorityOrder: Record<TodoPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const statusOrder: Record<TodoStatus, number> = {
  todo: 1,
  in_progress: 2,
  blocked: 3,
  done: 4,
};

type AttachmentPreviewKind = "image" | "pdf" | "other";

function getStatusBadgeClass(status: TodoStatus): string {
  switch (status) {
    case "todo":
      return "bg-slate-100 text-slate-700 hover:bg-slate-200/80";
    case "in_progress":
      return "bg-sky-100 text-sky-700 hover:bg-sky-200/80";
    case "blocked":
      return "bg-rose-100 text-rose-700 hover:bg-rose-200/80";
    case "done":
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80";
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-200/80";
  }
}

function getPriorityBadgeClass(priority: TodoPriority): string {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-700 hover:bg-slate-200/80";
    case "medium":
      return "bg-amber-100 text-amber-700 hover:bg-amber-200/80";
    case "high":
      return "bg-rose-100 text-rose-700 hover:bg-rose-200/80";
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-200/80";
  }
}

function formatAttachmentSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const sizeInKb = sizeInBytes / 1024;
  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(sizeInKb >= 100 ? 0 : 1)} KB`;
  }

  const sizeInMb = sizeInKb / 1024;
  return `${sizeInMb.toFixed(sizeInMb >= 100 ? 0 : 1)} MB`;
}

function inferAttachmentPreviewKind(contentType: string, fileName: string): AttachmentPreviewKind {
  const normalizedContentType = contentType.toLowerCase();
  if (normalizedContentType.startsWith("image/")) {
    return "image";
  }

  if (normalizedContentType === "application/pdf") {
    return "pdf";
  }

  const normalizedFileName = fileName.toLowerCase();
  if (/(\.jpg|\.jpeg|\.png|\.webp)$/.test(normalizedFileName)) {
    return "image";
  }

  if (normalizedFileName.endsWith(".pdf")) {
    return "pdf";
  }

  return "other";
}

const sortFieldLabels: Record<TodoSortField, string> = {
  createdAt: "Date de creation",
  updatedAt: "Derniere MAJ",
  dueDate: "Echeance",
  priority: "Priorite",
  status: "Statut",
  title: "Titre",
};

interface TodoFormState {
  title: string;
  description: string;
  dueDate: string;
  status: TodoStatus;
  priority: TodoPriority;
}

const defaultForm: TodoFormState = {
  title: "",
  description: "",
  dueDate: "",
  status: "todo",
  priority: "medium",
};

async function parseApiResponse<TData>(response: Response): Promise<TData> {
  const payload = (await response.json().catch(() => ({}))) as {
    data?: TData;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Une erreur inattendue est survenue.");
  }

  if (!payload.data) {
    throw new Error("Reponse API invalide.");
  }

  return payload.data;
}

function TodoCardSkeleton() {
  return (
    <Card className="border-slate-200/80">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="size-4 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

export function TodoApp() {
  const toastManager = useToastManager();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [formState, setFormState] = useState<TodoFormState>(defaultForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TodoStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TodoPriority>("all");
  const [sortField, setSortField] = useState<TodoSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showOnlyWithDueDate, setShowOnlyWithDueDate] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressByTodoId, setUploadProgressByTodoId] = useState<Record<string, number>>({});
  const [uploadingTodoIds, setUploadingTodoIds] = useState<Record<string, boolean>>({});
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/todos", {
        cache: "no-store",
      });
      const data = await parseApiResponse<TodoItem[]>(response);
      setTodos(data);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de charger les taches.",
        timeout: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toastManager]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  async function handleCreateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const createdTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) => [createdTodo, ...previousTodos]);
      setFormState(defaultForm);
      setIsFormOpen(false);
      toastManager.add({
        type: "success",
        title: "Tache creee avec succes.",
      });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de creer la tache.",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateTodo(todoId: string, updates: Partial<TodoItem>) {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de mettre a jour la tache.",
        timeout: 5000,
      });
    }
  }

  async function handleToggleTodo(todo: TodoItem, checked: boolean) {
    const nextStatus: TodoStatus = checked ? "done" : "in_progress";
    await handleUpdateTodo(todo.id, { status: nextStatus });
  }

  function handleDeleteClick(todoId: string) {
    if (confirmingDeleteId === todoId) {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
      setConfirmingDeleteId(null);
      void handleDeleteTodo(todoId);
    } else {
      setConfirmingDeleteId(todoId);
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      deleteTimerRef.current = setTimeout(() => {
        setConfirmingDeleteId(null);
        deleteTimerRef.current = null;
      }, 3000);
    }
  }

  async function handleDeleteTodo(todoId: string) {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Impossible de supprimer la tache.");
      }

      setTodos((previousTodos) => previousTodos.filter((todo) => todo.id !== todoId));
      toastManager.add({ type: "success", title: "Tache supprimee." });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de supprimer la tache.",
        timeout: 5000,
      });
    }
  }

  async function handleAttachmentUpload(todoId: string, file: File) {
    setUploadingTodoIds((previousState) => ({
      ...previousState,
      [todoId]: true,
    }));
    setUploadProgressByTodoId((previousState) => ({
      ...previousState,
      [todoId]: 0,
    }));

    try {
      const formData = new FormData();
      formData.set("file", file);

      const updatedTodo = await new Promise<TodoItem>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `/api/todos/${todoId}/attachment`);
        request.responseType = "json";

        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgressByTodoId((previousState) => ({
            ...previousState,
            [todoId]: Math.max(0, Math.min(100, progress)),
          }));
        };

        request.onerror = () => {
          reject(new Error("Impossible d'envoyer le fichier."));
        };

        request.onabort = () => {
          reject(new Error("Televersement annule."));
        };

        request.onload = () => {
          let payload: { data?: TodoItem; error?: string } = {};

          if (request.response && typeof request.response === "object") {
            payload = request.response as { data?: TodoItem; error?: string };
          } else {
            try {
              payload = JSON.parse(request.responseText || "{}") as { data?: TodoItem; error?: string };
            } catch {
              payload = {};
            }
          }

          if (request.status >= 200 && request.status < 300 && payload.data) {
            resolve(payload.data);
            return;
          }

          reject(new Error(payload.error ?? "Impossible d'ajouter la piece jointe."));
        };

        request.send(formData);
      });

      setUploadProgressByTodoId((previousState) => ({
        ...previousState,
        [todoId]: 100,
      }));
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      toastManager.add({ type: "success", title: "Piece jointe ajoutee." });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible d'ajouter la piece jointe.",
        timeout: 5000,
      });
    } finally {
      setUploadingTodoIds((previousState) => {
        const nextState = { ...previousState };
        delete nextState[todoId];
        return nextState;
      });

      window.setTimeout(() => {
        setUploadProgressByTodoId((previousState) => {
          const nextState = { ...previousState };
          delete nextState[todoId];
          return nextState;
        });
      }, 1000);
    }
  }

  async function handleAttachmentDelete(todoId: string) {
    try {
      const response = await fetch(`/api/todos/${todoId}/attachment`, {
        method: "DELETE",
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      setExpandedAttachments((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
      toastManager.add({ type: "success", title: "Piece jointe supprimee." });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de supprimer la piece jointe.",
        timeout: 5000,
      });
    }
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (showOnlyWithDueDate) count++;
    if (showOnlyOverdue) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [statusFilter, priorityFilter, showOnlyWithDueDate, showOnlyOverdue, searchQuery]);

  const filteredSortedTodos = useMemo(() => {
    const now = Date.now();
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredTodos = todos.filter((todo) => {
      if (statusFilter !== "all" && todo.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && todo.priority !== priorityFilter) {
        return false;
      }

      if (showOnlyWithDueDate && !todo.dueDate) {
        return false;
      }

      if (showOnlyOverdue) {
        if (!todo.dueDate || todo.status === "done") {
          return false;
        }

        const dueDateTimestamp = new Date(todo.dueDate).getTime();
        if (Number.isNaN(dueDateTimestamp) || dueDateTimestamp >= now) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [todo.title, todo.description ?? "", todo.attachment?.fileName ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    const sortedTodos = [...filteredTodos].sort((leftTodo, rightTodo) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = leftTodo.title.localeCompare(rightTodo.title, "fr");
          break;
        case "priority":
          comparison = priorityOrder[leftTodo.priority] - priorityOrder[rightTodo.priority];
          break;
        case "status":
          comparison = statusOrder[leftTodo.status] - statusOrder[rightTodo.status];
          break;
        case "dueDate": {
          const leftDueDate = leftTodo.dueDate ? new Date(leftTodo.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const rightDueDate = rightTodo.dueDate
            ? new Date(rightTodo.dueDate).getTime()
            : Number.POSITIVE_INFINITY;
          comparison = leftDueDate - rightDueDate;
          break;
        }
        case "updatedAt":
          comparison = new Date(leftTodo.updatedAt).getTime() - new Date(rightTodo.updatedAt).getTime();
          break;
        case "createdAt":
        default:
          comparison = new Date(leftTodo.createdAt).getTime() - new Date(rightTodo.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sortedTodos;
  }, [
    priorityFilter,
    searchQuery,
    showOnlyOverdue,
    showOnlyWithDueDate,
    sortDirection,
    sortField,
    statusFilter,
    todos,
  ]);

  function handleResetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortField("createdAt");
    setSortDirection("desc");
    setShowOnlyWithDueDate(false);
    setShowOnlyOverdue(false);
  }

  function toggleAttachmentPreview(todoId: string) {
    setExpandedAttachments((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Todo App
        </h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Gerez vos taches et suivez leur avancement.
        </p>
      </header>

      {/* Collapsible creation form */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
        <CollapsibleTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between gap-2 border-dashed border-slate-300 py-5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            />
          }
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="size-4" />
            Nouvelle tache
          </span>
          <ChevronDown
            className={`size-4 text-slate-400 transition-transform duration-200 ${isFormOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <Card className="mt-3 border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle>Nouvelle tache</CardTitle>
              <CardDescription>
                Ajoutez un titre, une description, une priorite, un statut initial et une date cible optionnelle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTodo} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((previousState) => ({
                        ...previousState,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Ex: Ajouter le monitoring App Service"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((previousState) => ({
                        ...previousState,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Details de la tache"
                    maxLength={500}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Date cible</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formState.dueDate}
                      onChange={(event) =>
                        setFormState((previousState) => ({
                          ...previousState,
                          dueDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Statut</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(value) =>
                        setFormState((prev) => ({ ...prev, status: value as TodoStatus }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {todoStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {todoStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priorite</Label>
                    <Select
                      value={formState.priority}
                      onValueChange={(value) =>
                        setFormState((prev) => ({ ...prev, priority: value as TodoPriority }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {todoPriorityValues.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {todoPriorityLabels[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Creation...
                      </span>
                    ) : (
                      "Ajouter la tache"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher une tache..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={(v) => setSortField(v as TodoSortField)}>
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
              onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={sortDirection === "asc" ? "Tri descendant" : "Tri ascendant"}
            >
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${sortDirection === "asc" ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Statut</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
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
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
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
            onClick={() => setPriorityFilter("all")}
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
              onClick={() => setPriorityFilter(priorityFilter === priority ? "all" : priority)}
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

        {/* Checkbox filters + result count */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
            <Checkbox
              checked={showOnlyWithDueDate}
              onCheckedChange={(checked) => setShowOnlyWithDueDate(checked === true)}
            />
            Avec echeance
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
            <Checkbox
              checked={showOnlyOverdue}
              onCheckedChange={(checked) => setShowOnlyOverdue(checked === true)}
            />
            En retard
          </label>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-slate-500"
              onClick={handleResetFilters}
            >
              <RotateCcw className="size-3" />
              Reinitialiser
              <Badge className="ml-0.5 bg-slate-200 text-slate-700">{activeFilterCount}</Badge>
            </Button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            {filteredSortedTodos.length} / {todos.length} taches
          </span>
        </div>
      </div>

      {/* Todo list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Liste des taches</h2>
          <Button variant="outline" size="sm" onClick={() => void loadTodos()} disabled={isLoading}>
            Rafraichir
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="grid gap-3">
            <TodoCardSkeleton />
            <TodoCardSkeleton />
            <TodoCardSkeleton />
          </div>
        ) : null}

        {!isLoading && filteredSortedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="mb-3 size-12 text-slate-300" />
            {todos.length === 0 ? (
              <>
                <p className="text-base font-medium text-slate-500">Aucune tache</p>
                <p className="mt-1 text-sm text-slate-400">
                  Commencez par creer votre premiere tache.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus className="size-4" />
                  Creer une tache
                </Button>
              </>
            ) : (
              <>
                <p className="text-base font-medium text-slate-500">Aucun resultat</p>
                <p className="mt-1 text-sm text-slate-400">
                  Aucune tache ne correspond a vos filtres.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="size-3" />
                  Reinitialiser les filtres
                </Button>
              </>
            )}
          </div>
        ) : null}

        <div className="grid gap-3">
          {filteredSortedTodos.map((todo, index) => {
            const isDone = todo.status === "done";
            const isUploadingAttachment = uploadingTodoIds[todo.id] === true;
            const uploadProgress = uploadProgressByTodoId[todo.id];
            const attachmentPreviewUrl = `/api/todos/${todo.id}/attachment`;
            const attachmentDownloadUrl = `/api/todos/${todo.id}/attachment?download=1`;
            const attachmentPreviewKind = todo.attachment
              ? inferAttachmentPreviewKind(todo.attachment.contentType, todo.attachment.fileName)
              : "other";
            const isAttachmentExpanded = expandedAttachments.has(todo.id);
            const isConfirmingDelete = confirmingDeleteId === todo.id;

            return (
              <Card
                key={todo.id}
                className={`border-slate-200/80 transition-all duration-200 hover:border-slate-300 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both ${isDone ? "opacity-60" : ""}`}
                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={(checked) => {
                            void handleToggleTodo(todo, checked === true);
                          }}
                          aria-label={`Basculer le statut de ${todo.title}`}
                        />
                        <CardTitle
                          className={`transition-all duration-300 ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}
                        >
                          {todo.title}
                        </CardTitle>

                        {/* Clickable status badge */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                title={`Changer le statut : ${todoStatusLabels[todo.status]}`}
                                className={`inline-flex h-5 cursor-pointer items-center rounded-full px-2 text-xs font-medium transition-shadow hover:ring-2 hover:ring-ring/30 ${getStatusBadgeClass(todo.status)}`}
                              />
                            }
                          >
                            {todoStatusLabels[todo.status]}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuRadioGroup
                              value={todo.status}
                              onValueChange={(value) => {
                                void handleUpdateTodo(todo.id, { status: value as TodoStatus });
                              }}
                            >
                              {todoStatusValues.map((status) => (
                                <DropdownMenuRadioItem key={status} value={status}>
                                  {todoStatusLabels[status]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clickable priority badge */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                title={`Changer la priorite : ${todoPriorityLabels[todo.priority]}`}
                                className={`inline-flex h-5 cursor-pointer items-center rounded-full px-2 text-xs font-medium transition-shadow hover:ring-2 hover:ring-ring/30 ${getPriorityBadgeClass(todo.priority)}`}
                              />
                            }
                          >
                            {todoPriorityLabels[todo.priority]}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuRadioGroup
                              value={todo.priority}
                              onValueChange={(value) => {
                                void handleUpdateTodo(todo.id, { priority: value as TodoPriority });
                              }}
                            >
                              {todoPriorityValues.map((priority) => (
                                <DropdownMenuRadioItem key={priority} value={priority}>
                                  {todoPriorityLabels[priority]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {todo.description ? (
                        <CardDescription className="pl-6">{todo.description}</CardDescription>
                      ) : null}
                    </div>

                    {/* Delete button with confirmation */}
                    <Button
                      variant={isConfirmingDelete ? "destructive" : "ghost"}
                      size={isConfirmingDelete ? "sm" : "icon"}
                      onClick={() => handleDeleteClick(todo.id)}
                      aria-label={`Supprimer ${todo.title}`}
                      className={`shrink-0 transition-all ${isConfirmingDelete ? "h-8 px-3 text-xs" : ""}`}
                    >
                      {isConfirmingDelete ? "Supprimer ?" : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm text-slate-500">
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <span className="text-xs">
                      {format(new Date(todo.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                    {todo.dueDate ? (
                      <Badge variant="outline" className="text-xs">
                        Echeance {format(new Date(todo.dueDate), "dd MMM yyyy", { locale: fr })}
                      </Badge>
                    ) : null}
                  </div>

                  {/* Compact attachment section */}
                  <div className="space-y-2 pl-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label
                        htmlFor={`attachment-${todo.id}`}
                        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-input px-2.5 text-xs transition-colors hover:bg-slate-50"
                      >
                        <Paperclip className="size-3.5" />
                        {isUploadingAttachment ? "Envoi..." : "Joindre"}
                      </Label>
                      <Input
                        id={`attachment-${todo.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        disabled={isUploadingAttachment}
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0];
                          if (!selectedFile) {
                            return;
                          }

                          void handleAttachmentUpload(todo.id, selectedFile);
                          event.target.value = "";
                        }}
                      />
                      {todo.attachment ? (
                        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
                          <Paperclip className="size-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">{todo.attachment.fileName}</span>
                          <span className="text-xs text-slate-400">{formatAttachmentSize(todo.attachment.size)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs"
                            onClick={() => toggleAttachmentPreview(todo.id)}
                            aria-label={isAttachmentExpanded ? "Masquer l'apercu" : "Afficher l'apercu"}
                          >
                            {isAttachmentExpanded ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs"
                            onClick={() => {
                              window.open(attachmentDownloadUrl, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Download className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs text-rose-500 hover:text-rose-700"
                            onClick={() => void handleAttachmentDelete(todo.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {uploadProgress !== undefined ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Upload</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            role="progressbar"
                            aria-label={`Progression upload pour ${todo.title}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={uploadProgress}
                            className="h-full rounded-full bg-sky-500 transition-[width] duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {todo.attachment && isAttachmentExpanded ? (
                      <div className="animate-in fade-in-0 slide-in-from-top-1 rounded-md border border-slate-200 bg-white p-2 duration-200">
                        {attachmentPreviewKind === "image" ? (
                          <object
                            type={todo.attachment.contentType || "image/*"}
                            data={attachmentPreviewUrl}
                            className="max-h-60 w-full rounded-md object-contain"
                            aria-label={`Apercu image de ${todo.attachment.fileName}`}
                          >
                            <p className="p-2 text-xs text-slate-500">Apercu image indisponible.</p>
                          </object>
                        ) : null}

                        {attachmentPreviewKind === "pdf" ? (
                          <iframe
                            src={attachmentPreviewUrl}
                            title={`Apercu PDF de ${todo.attachment.fileName}`}
                            className="h-72 w-full rounded-md border border-slate-200"
                          />
                        ) : null}

                        {attachmentPreviewKind === "other" ? (
                          <p className="p-1 text-xs text-slate-500">
                            Apercu non disponible pour ce type de fichier.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
