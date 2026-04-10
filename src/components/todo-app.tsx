"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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

function getStatusBadgeClass(status: TodoStatus): string {
  switch (status) {
    case "todo":
      return "bg-slate-100 text-slate-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    case "blocked":
      return "bg-rose-100 text-rose-700";
    case "done":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPriorityBadgeClass(priority: TodoPriority): string {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    case "high":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

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

export function TodoApp() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [formState, setFormState] = useState<TodoFormState>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TodoStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TodoPriority>("all");
  const [sortField, setSortField] = useState<TodoSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showOnlyWithDueDate, setShowOnlyWithDueDate] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/todos", {
        cache: "no-store",
      });
      const data = await parseApiResponse<TodoItem[]>(response);
      setTodos(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les taches.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  async function handleCreateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

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
      setMessage("Tache creee avec succes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de creer la tache.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateTodo(todoId: string, updates: Partial<TodoItem>) {
    setErrorMessage(null);

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
      setErrorMessage(error instanceof Error ? error.message : "Impossible de mettre a jour la tache.");
    }
  }

  async function handleToggleTodo(todo: TodoItem, checked: boolean) {
    const nextStatus: TodoStatus = checked ? "done" : "in_progress";
    await handleUpdateTodo(todo.id, { status: nextStatus });
  }

  async function handleDeleteTodo(todoId: string) {
    setErrorMessage(null);
    setMessage(null);

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
      setMessage("Tache supprimee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de supprimer la tache.");
    }
  }

  async function handleAttachmentUpload(todoId: string, file: File) {
    setErrorMessage(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/todos/${todoId}/attachment`, {
        method: "POST",
        body: formData,
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      setMessage("Piece jointe ajoutee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'ajouter la piece jointe.");
    }
  }

  async function handleAttachmentDelete(todoId: string) {
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/todos/${todoId}/attachment`, {
        method: "DELETE",
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      setMessage("Piece jointe supprimee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de supprimer la piece jointe.");
    }
  }

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Azure Todo MVP</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Todo App avec Azure</h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          Cette iteration ajoute des statuts enrichis, des priorites, et un espace de filtres et tris avances.
        </p>
      </header>

      <Card className="border-slate-200/70 shadow-sm">
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
            <div className="grid gap-2 sm:max-w-xs">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  aria-label="Statut initial de la tache"
                  title="Statut initial de la tache"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((previousState) => ({
                      ...previousState,
                      status: event.target.value as TodoStatus,
                    }))
                  }
                >
                  {todoStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {todoStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priorite</Label>
                <select
                  id="priority"
                  aria-label="Priorite initiale de la tache"
                  title="Priorite initiale de la tache"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.priority}
                  onChange={(event) =>
                    setFormState((previousState) => ({
                      ...previousState,
                      priority: event.target.value as TodoPriority,
                    }))
                  }
                >
                  {todoPriorityValues.map((priority) => (
                    <option key={priority} value={priority}>
                      {todoPriorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle>Filtres et tris avances</CardTitle>
          <CardDescription>Combinez recherche, filtres et tri pour piloter votre backlog.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="search">Recherche</Label>
              <Input
                id="search"
                placeholder="Titre, description, fichier joint..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="statusFilter">Statut</Label>
                <select
                  id="statusFilter"
                  aria-label="Filtrer par statut"
                  title="Filtrer par statut"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | TodoStatus)}
                >
                  <option value="all">Tous</option>
                  {todoStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {todoStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priorityFilter">Priorite</Label>
                <select
                  id="priorityFilter"
                  aria-label="Filtrer par priorite"
                  title="Filtrer par priorite"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as "all" | TodoPriority)}
                >
                  <option value="all">Toutes</option>
                  {todoPriorityValues.map((priority) => (
                    <option key={priority} value={priority}>
                      {todoPriorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="sortField">Tri</Label>
              <select
                id="sortField"
                aria-label="Trier par"
                title="Trier par"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={sortField}
                onChange={(event) => setSortField(event.target.value as TodoSortField)}
              >
                <option value="createdAt">Date de creation</option>
                <option value="updatedAt">Derniere mise a jour</option>
                <option value="dueDate">Echeance</option>
                <option value="priority">Priorite</option>
                <option value="status">Statut</option>
                <option value="title">Titre</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortDirection">Sens</Label>
              <select
                id="sortDirection"
                aria-label="Sens du tri"
                title="Sens du tri"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
              >
                <option value="asc">Ascendant</option>
                <option value="desc">Descendant</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setSortField("createdAt");
                  setSortDirection("desc");
                  setShowOnlyWithDueDate(false);
                  setShowOnlyOverdue(false);
                }}
              >
                Reinitialiser
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyWithDueDate}
                onChange={(event) => setShowOnlyWithDueDate(event.target.checked)}
              />
              Avec echeance
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyOverdue}
                onChange={(event) => setShowOnlyOverdue(event.target.checked)}
              />
              En retard uniquement
            </label>
            <span className="text-slate-500">Resultat: {filteredSortedTodos.length} / {todos.length}</span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-slate-900">Liste des taches</h2>
          <Button variant="outline" onClick={() => void loadTodos()} disabled={isLoading}>
            Rafraichir
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="size-4 animate-spin" />
            Chargement des taches...
          </div>
        ) : null}

        {!isLoading && filteredSortedTodos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-slate-600">
              Aucune tache ne correspond a vos filtres.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3">
          {filteredSortedTodos.map((todo) => {
            const isDone = todo.status === "done";

            return (
              <Card key={todo.id} className="border-slate-200/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={(checked) => {
                            void handleToggleTodo(todo, checked === true);
                          }}
                          aria-label={`Basculer le statut de ${todo.title}`}
                        />
                        <CardTitle className={isDone ? "line-through text-slate-500" : "text-slate-900"}>
                          {todo.title}
                        </CardTitle>
                        <Badge className={getStatusBadgeClass(todo.status)}>
                          {todoStatusLabels[todo.status]}
                        </Badge>
                        <Badge className={getPriorityBadgeClass(todo.priority)}>
                          Priorite {todoPriorityLabels[todo.priority]}
                        </Badge>
                      </div>
                      {todo.description ? <CardDescription>{todo.description}</CardDescription> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDeleteTodo(todo.id)}
                      aria-label={`Supprimer ${todo.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Creee le {format(new Date(todo.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                    {todo.dueDate ? (
                      <Badge variant="outline">
                        Echeance {format(new Date(todo.dueDate), "dd MMM yyyy", { locale: fr })}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>Statut</Label>
                      <select
                        aria-label={`Statut de ${todo.title}`}
                        title={`Statut de ${todo.title}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={todo.status}
                        onChange={(event) => {
                          void handleUpdateTodo(todo.id, {
                            status: event.target.value as TodoStatus,
                          });
                        }}
                      >
                        {todoStatusValues.map((status) => (
                          <option key={status} value={status}>
                            {todoStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-1">
                      <Label>Priorite</Label>
                      <select
                        aria-label={`Priorite de ${todo.title}`}
                        title={`Priorite de ${todo.title}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={todo.priority}
                        onChange={(event) => {
                          void handleUpdateTodo(todo.id, {
                            priority: event.target.value as TodoPriority,
                          });
                        }}
                      >
                        {todoPriorityValues.map((priority) => (
                          <option key={priority} value={priority}>
                            {todoPriorityLabels[priority]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Label
                      htmlFor={`attachment-${todo.id}`}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm"
                    >
                      <Paperclip className="size-4" />
                      Joindre un fichier
                    </Label>
                    <Input
                      id={`attachment-${todo.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
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
                      <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5">
                        <span className="text-xs">
                          {todo.attachment.fileName} ({Math.ceil(todo.attachment.size / 1024)} KB)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => void handleAttachmentDelete(todo.id)}
                        >
                          Retirer
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Aucune piece jointe</span>
                    )}
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
