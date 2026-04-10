"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToastManager } from "@/components/ui/toast";
import { type TodoItem, type TodoPriority, type TodoStatus } from "@/lib/types";

import { TodoCreateForm } from "./todo/todo-create-form";
import { TodoFilterBar } from "./todo/todo-filter-bar";
import { TodoKanbanBoard } from "./todo/todo-kanban-board";
import { TodoListView } from "./todo/todo-list-view";
import {
  VIEW_MODE_STORAGE_KEY,
  areStringArraysEqual,
  createEmptyKanbanOrder,
  defaultForm,
  mapTodoStatusToKanbanColumn,
  priorityOrder,
  statusOrder,
  type KanbanColumnStatus,
  type KanbanOrderByColumn,
  type SortDirection,
  type TodoSortField,
  type TodoViewMode,
} from "./todo/todo-view-model";

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
  const toastManager = useToastManager();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [viewMode, setViewMode] = useState<TodoViewMode>(() => {
    if (typeof window === "undefined") {
      return "list";
    }

    const savedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return savedViewMode === "kanban" ? "kanban" : "list";
  });
  const [formState, setFormState] = useState(defaultForm);
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
  const [deletingTodoIds, setDeletingTodoIds] = useState<Record<string, boolean>>({});
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null);
  const [recentlyCreatedTodoId, setRecentlyCreatedTodoId] = useState<string | null>(null);
  const [kanbanOrderByColumn, setKanbanOrderByColumn] = useState<KanbanOrderByColumn>(createEmptyKanbanOrder);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<KanbanColumnStatus | null>(null);
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashTodoCard = useCallback((todoId: string, durationMs = 900) => {
    setHighlightedTodoId(todoId);
    window.setTimeout(() => {
      setHighlightedTodoId((currentTodoId) => (currentTodoId === todoId ? null : currentTodoId));
    }, durationMs);
  }, []);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/todos", { cache: "no-store" });
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

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  async function handleCreateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const createdTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) => [createdTodo, ...previousTodos]);
      setRecentlyCreatedTodoId(createdTodo.id);
      flashTodoCard(createdTodo.id, 1400);
      window.setTimeout(() => {
        setRecentlyCreatedTodoId((currentTodoId) => (currentTodoId === createdTodo.id ? null : currentTodoId));
      }, 650);
      setFormState(defaultForm);
      setIsFormOpen(false);
      toastManager.add({ type: "success", title: "Tache creee avec succes." });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      flashTodoCard(updatedTodo.id);
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
      return;
    }

    setConfirmingDeleteId(todoId);
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    deleteTimerRef.current = setTimeout(() => {
      setConfirmingDeleteId(null);
      deleteTimerRef.current = null;
    }, 3000);
  }

  async function handleDeleteTodo(todoId: string) {
    try {
      const response = await fetch(`/api/todos/${todoId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Impossible de supprimer la tache.");
      }

      setDeletingTodoIds((previousState) => ({
        ...previousState,
        [todoId]: true,
      }));

      window.setTimeout(() => {
        setTodos((previousTodos) => previousTodos.filter((todo) => todo.id !== todoId));
        setDeletingTodoIds((previousState) => {
          const nextState = { ...previousState };
          delete nextState[todoId];
          return nextState;
        });
      }, 220);

      toastManager.add({ type: "success", title: "Tache supprimee." });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: error instanceof Error ? error.message : "Impossible de supprimer la tache.",
        timeout: 5000,
      });
    }
  }

  async function handleDropTodoInKanban(targetColumnStatus: KanbanColumnStatus, todoId: string) {
    const draggedTodo = todos.find((todo) => todo.id === todoId);
    if (!draggedTodo) {
      return;
    }

    const currentColumnStatus = mapTodoStatusToKanbanColumn(draggedTodo.status);
    if (currentColumnStatus === targetColumnStatus) {
      return;
    }

    const nextStatus: TodoStatus =
      targetColumnStatus === "todo"
        ? "todo"
        : targetColumnStatus === "done"
          ? "done"
          : "in_progress";

    await handleUpdateTodo(todoId, { status: nextStatus });
  }

  function reorderKanbanCards(
    todoId: string,
    sourceColumnStatus: KanbanColumnStatus,
    targetColumnStatus: KanbanColumnStatus,
    beforeTodoId?: string,
  ) {
    setKanbanOrderByColumn((previousOrder) => {
      const nextOrder: KanbanOrderByColumn = {
        todo: [...previousOrder.todo],
        in_progress: [...previousOrder.in_progress],
        done: [...previousOrder.done],
      };

      nextOrder[sourceColumnStatus] = nextOrder[sourceColumnStatus].filter((id) => id !== todoId);
      nextOrder[targetColumnStatus] = nextOrder[targetColumnStatus].filter((id) => id !== todoId);

      const targetColumnOrder = [...nextOrder[targetColumnStatus]];
      if (beforeTodoId) {
        const targetIndex = targetColumnOrder.indexOf(beforeTodoId);
        if (targetIndex >= 0) {
          targetColumnOrder.splice(targetIndex, 0, todoId);
        } else {
          targetColumnOrder.push(todoId);
        }
      } else {
        targetColumnOrder.push(todoId);
      }

      nextOrder[targetColumnStatus] = targetColumnOrder;
      return nextOrder;
    });
  }

  function handleTodoDragStart(event: React.DragEvent<HTMLElement>, todoId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", todoId);
    setDraggedTodoId(todoId);
  }

  function handleTodoDragEnd() {
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setActiveDropColumn(null);
  }

  function handleKanbanColumnDragOver(event: React.DragEvent<HTMLElement>, columnStatus: KanbanColumnStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTodoId(null);

    if (activeDropColumn !== columnStatus) {
      setActiveDropColumn(columnStatus);
    }
  }

  function handleKanbanCardDragOver(
    event: React.DragEvent<HTMLElement>,
    columnStatus: KanbanColumnStatus,
    overTodoId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    if (activeDropColumn !== columnStatus) {
      setActiveDropColumn(columnStatus);
    }

    if (dragOverTodoId !== overTodoId) {
      setDragOverTodoId(overTodoId);
    }
  }

  async function handleKanbanDrop(columnStatus: KanbanColumnStatus, beforeTodoId?: string) {
    const todoId = draggedTodoId;

    setActiveDropColumn(null);
    setDragOverTodoId(null);
    setDraggedTodoId(null);

    if (!todoId || beforeTodoId === todoId) {
      return;
    }

    const draggedTodo = todos.find((todo) => todo.id === todoId);
    if (!draggedTodo) {
      return;
    }

    const sourceColumnStatus = mapTodoStatusToKanbanColumn(draggedTodo.status);
    reorderKanbanCards(todoId, sourceColumnStatus, columnStatus, beforeTodoId);

    if (sourceColumnStatus !== columnStatus) {
      await handleDropTodoInKanban(columnStatus, todoId);
      return;
    }

    flashTodoCard(todoId, 600);
  }

  function handleKanbanColumnDrop(event: React.DragEvent<HTMLElement>, columnStatus: KanbanColumnStatus) {
    event.preventDefault();
    void handleKanbanDrop(columnStatus);
  }

  function handleKanbanCardDrop(
    event: React.DragEvent<HTMLElement>,
    columnStatus: KanbanColumnStatus,
    beforeTodoId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    void handleKanbanDrop(columnStatus, beforeTodoId);
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
      setExpandedAttachments((previousExpandedAttachments) => {
        const nextExpandedAttachments = new Set(previousExpandedAttachments);
        nextExpandedAttachments.delete(todoId);
        return nextExpandedAttachments;
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

  useEffect(() => {
    setKanbanOrderByColumn((previousOrder) => {
      const filteredTodoIdsByColumn: KanbanOrderByColumn = createEmptyKanbanOrder();

      filteredSortedTodos.forEach((todo) => {
        filteredTodoIdsByColumn[mapTodoStatusToKanbanColumn(todo.status)].push(todo.id);
      });

      const nextOrder: KanbanOrderByColumn = createEmptyKanbanOrder();
      (Object.keys(filteredTodoIdsByColumn) as KanbanColumnStatus[]).forEach((columnStatus) => {
        const existingOrderedTodoIds = previousOrder[columnStatus].filter((todoId) =>
          filteredTodoIdsByColumn[columnStatus].includes(todoId),
        );
        const missingTodoIds = filteredTodoIdsByColumn[columnStatus].filter(
          (todoId) => !existingOrderedTodoIds.includes(todoId),
        );

        nextOrder[columnStatus] = [...existingOrderedTodoIds, ...missingTodoIds];
      });

      if (
        areStringArraysEqual(previousOrder.todo, nextOrder.todo) &&
        areStringArraysEqual(previousOrder.in_progress, nextOrder.in_progress) &&
        areStringArraysEqual(previousOrder.done, nextOrder.done)
      ) {
        return previousOrder;
      }

      return nextOrder;
    });
  }, [filteredSortedTodos]);

  const filteredTodosById = useMemo(() => {
    return new Map(filteredSortedTodos.map((todo) => [todo.id, todo]));
  }, [filteredSortedTodos]);

  const kanbanTodosByColumn = useMemo(() => {
    const groupedTodos: Record<KanbanColumnStatus, TodoItem[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    (Object.keys(kanbanOrderByColumn) as KanbanColumnStatus[]).forEach((columnStatus) => {
      groupedTodos[columnStatus] = kanbanOrderByColumn[columnStatus]
        .map((todoId) => filteredTodosById.get(todoId))
        .filter((todo): todo is TodoItem => Boolean(todo));
    });

    return groupedTodos;
  }, [filteredTodosById, kanbanOrderByColumn]);

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
    setExpandedAttachments((previousExpandedAttachments) => {
      const nextExpandedAttachments = new Set(previousExpandedAttachments);
      if (nextExpandedAttachments.has(todoId)) {
        nextExpandedAttachments.delete(todoId);
      } else {
        nextExpandedAttachments.add(todoId);
      }
      return nextExpandedAttachments;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Todo App</h1>
        <p className="text-sm text-slate-500 sm:text-base">Gerez vos taches et suivez leur avancement.</p>
      </header>

      <TodoCreateForm
        isFormOpen={isFormOpen}
        isSubmitting={isSubmitting}
        formState={formState}
        onFormOpenChange={setIsFormOpen}
        onFormStateChange={setFormState}
        onSubmit={handleCreateTodo}
      />

      <TodoFilterBar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        sortField={sortField}
        sortDirection={sortDirection}
        showOnlyWithDueDate={showOnlyWithDueDate}
        showOnlyOverdue={showOnlyOverdue}
        activeFilterCount={activeFilterCount}
        totalTodos={todos.length}
        filteredTodosCount={filteredSortedTodos.length}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onPriorityFilterChange={setPriorityFilter}
        onSortFieldChange={setSortField}
        onToggleSortDirection={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))}
        onShowOnlyWithDueDateChange={setShowOnlyWithDueDate}
        onShowOnlyOverdueChange={setShowOnlyOverdue}
        onResetFilters={handleResetFilters}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">{viewMode === "list" ? "Liste des taches" : "Vue Kanban"}</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode("list")}
              >
                Liste
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadTodos()} disabled={isLoading}>
              Rafraichir
            </Button>
          </div>
        </div>

        <Separator />

        {viewMode === "list" ? (
          <TodoListView
            todos={filteredSortedTodos}
            totalTodos={todos.length}
            isLoading={isLoading}
            uploadingTodoIds={uploadingTodoIds}
            uploadProgressByTodoId={uploadProgressByTodoId}
            deletingTodoIds={deletingTodoIds}
            highlightedTodoId={highlightedTodoId}
            recentlyCreatedTodoId={recentlyCreatedTodoId}
            expandedAttachments={expandedAttachments}
            confirmingDeleteId={confirmingDeleteId}
            onOpenCreateForm={() => setIsFormOpen(true)}
            onResetFilters={handleResetFilters}
            onToggleTodo={(todo, checked) => {
              void handleToggleTodo(todo, checked);
            }}
            onUpdateTodo={(todoId, updates) => {
              void handleUpdateTodo(todoId, updates);
            }}
            onDeleteClick={handleDeleteClick}
            onAttachmentUpload={(todoId, file) => {
              void handleAttachmentUpload(todoId, file);
            }}
            onToggleAttachmentPreview={toggleAttachmentPreview}
            onAttachmentDelete={(todoId) => {
              void handleAttachmentDelete(todoId);
            }}
          />
        ) : (
          <TodoKanbanBoard
            todosByColumn={kanbanTodosByColumn}
            activeDropColumn={activeDropColumn}
            draggedTodoId={draggedTodoId}
            dragOverTodoId={dragOverTodoId}
            deletingTodoIds={deletingTodoIds}
            highlightedTodoId={highlightedTodoId}
            onColumnDragOver={handleKanbanColumnDragOver}
            onColumnDrop={handleKanbanColumnDrop}
            onColumnDragLeave={(columnStatus) => {
              if (activeDropColumn === columnStatus) {
                setActiveDropColumn(null);
              }
            }}
            onCardDragStart={handleTodoDragStart}
            onCardDragEnd={handleTodoDragEnd}
            onCardDragOver={handleKanbanCardDragOver}
            onCardDrop={handleKanbanCardDrop}
            onDeleteTodo={(todoId) => {
              void handleDeleteTodo(todoId);
            }}
          />
        )}
      </section>
    </div>
  );
}
