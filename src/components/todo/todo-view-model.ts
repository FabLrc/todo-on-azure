import type { TodoPriority, TodoStatus } from "@/lib/types";

export type TodoSortField = "createdAt" | "updatedAt" | "dueDate" | "priority" | "title" | "status";
export type SortDirection = "asc" | "desc";
export type TodoViewMode = "list" | "kanban";
export type KanbanColumnStatus = "todo" | "in_progress" | "done";
export type KanbanOrderByColumn = Record<KanbanColumnStatus, string[]>;
export type AttachmentPreviewKind = "image" | "pdf" | "other";

export interface TodoFormState {
  title: string;
  description: string;
  dueDate: string;
  status: TodoStatus;
  priority: TodoPriority;
}

export const defaultForm: TodoFormState = {
  title: "",
  description: "",
  dueDate: "",
  status: "todo",
  priority: "medium",
};

export const kanbanColumns: Array<{ status: KanbanColumnStatus; title: string; caption: string }> = [
  {
    status: "todo",
    title: "En attente",
    caption: "A faire",
  },
  {
    status: "in_progress",
    title: "En cours",
    caption: "Execution",
  },
  {
    status: "done",
    title: "Termine",
    caption: "Clos",
  },
];

export const sortFieldLabels: Record<TodoSortField, string> = {
  createdAt: "Date de creation",
  updatedAt: "Derniere MAJ",
  dueDate: "Echeance",
  priority: "Priorite",
  status: "Statut",
  title: "Titre",
};

export const priorityOrder: Record<TodoPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export const statusOrder: Record<TodoStatus, number> = {
  todo: 1,
  in_progress: 2,
  blocked: 3,
  done: 4,
};

export const VIEW_MODE_STORAGE_KEY = "todoapp:view-mode";

export function createEmptyKanbanOrder(): KanbanOrderByColumn {
  return {
    todo: [],
    in_progress: [],
    done: [],
  };
}

export function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function mapTodoStatusToKanbanColumn(status: TodoStatus): KanbanColumnStatus {
  if (status === "todo") {
    return "todo";
  }

  if (status === "done") {
    return "done";
  }

  return "in_progress";
}

export function getStatusBadgeClass(status: TodoStatus): string {
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

export function getPriorityBadgeClass(priority: TodoPriority): string {
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

export function formatAttachmentSize(sizeInBytes: number): string {
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

export function inferAttachmentPreviewKind(contentType: string, fileName: string): AttachmentPreviewKind {
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
