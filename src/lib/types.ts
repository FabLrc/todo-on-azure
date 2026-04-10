export const todoStatusValues = ["todo", "in_progress", "blocked", "done"] as const;
export type TodoStatus = (typeof todoStatusValues)[number];

export const todoPriorityValues = ["low", "medium", "high"] as const;
export type TodoPriority = (typeof todoPriorityValues)[number];

export const todoStatusLabels: Record<TodoStatus, string> = {
  todo: "A faire",
  in_progress: "En cours",
  blocked: "Bloquee",
  done: "Terminee",
};

export const todoPriorityLabels: Record<TodoPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export interface TodoAttachment {
  blobName: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  url?: string;
}

export interface TodoItem {
  id: string;
  partitionKey: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  attachment?: TodoAttachment;
}
