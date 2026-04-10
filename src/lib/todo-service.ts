import { v4 as uuidv4 } from "uuid";

import {
  createTodoInStore,
  deleteTodoFromStore,
  getTodoByIdFromStore,
  listTodosFromStore,
  updateTodoInStore,
} from "@/lib/cosmos";
import { deleteTodoAttachment, uploadTodoAttachment } from "@/lib/blob";
import { getAppSettings } from "@/lib/server-config";
import type { TodoItem, TodoPriority, TodoStatus } from "@/lib/types";
import { createTodoSchema, updateTodoSchema } from "@/lib/validation";

type PersistedTodoItem = TodoItem & {
  status?: string;
  priority?: string;
};

function normalizeStatus(value: unknown): TodoStatus {
  if (value === "todo" || value === "in_progress" || value === "blocked" || value === "done") {
    return value;
  }

  if (value === "pending") {
    return "todo";
  }

  return "todo";
}

function normalizePriority(value: unknown): TodoPriority {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeTodo(todo: PersistedTodoItem): TodoItem {
  return {
    ...todo,
    status: normalizeStatus(todo.status),
    priority: normalizePriority(todo.priority),
  };
}

function normalizeIsoDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export async function listTodos(): Promise<TodoItem[]> {
  const settings = await getAppSettings();
  const todos = await listTodosFromStore(settings.cosmos.partitionKeyValue);

  return todos.map((todo) => normalizeTodo(todo as PersistedTodoItem));
}

export async function createTodo(input: unknown): Promise<TodoItem> {
  const data = createTodoSchema.parse(input);
  const settings = await getAppSettings();
  const now = new Date().toISOString();

  const todo: TodoItem = {
    id: uuidv4(),
    partitionKey: settings.cosmos.partitionKeyValue,
    title: data.title,
    description: data.description,
    dueDate: normalizeIsoDate(data.dueDate),
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    createdAt: now,
    updatedAt: now,
  };

  return createTodoInStore(todo);
}

export async function updateTodo(id: string, input: unknown): Promise<TodoItem | null> {
  const settings = await getAppSettings();
  const currentTodoFromStore = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);
  if (!currentTodoFromStore) {
    return null;
  }

  const currentTodo = normalizeTodo(currentTodoFromStore as PersistedTodoItem);

  const updates = updateTodoSchema.parse(input);

  const updatedTodo: TodoItem = {
    ...currentTodo,
    ...updates,
    status: normalizeStatus(updates.status ?? currentTodo.status),
    priority: normalizePriority(updates.priority ?? currentTodo.priority),
    dueDate: normalizeIsoDate(updates.dueDate) ?? currentTodo.dueDate,
    updatedAt: new Date().toISOString(),
  };

  return updateTodoInStore(updatedTodo);
}

export async function deleteTodo(id: string): Promise<boolean> {
  const settings = await getAppSettings();
  const currentTodoFromStore = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);
  const currentTodo = currentTodoFromStore
    ? normalizeTodo(currentTodoFromStore as PersistedTodoItem)
    : null;

  if (!currentTodo) {
    return false;
  }

  if (currentTodo.attachment) {
    await deleteTodoAttachment(currentTodo.attachment.blobName);
  }

  await deleteTodoFromStore(id, settings.cosmos.partitionKeyValue);
  return true;
}

export async function attachFileToTodo(id: string, file: File): Promise<TodoItem | null> {
  const settings = await getAppSettings();
  const currentTodoFromStore = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);
  const currentTodo = currentTodoFromStore
    ? normalizeTodo(currentTodoFromStore as PersistedTodoItem)
    : null;

  if (!currentTodo) {
    return null;
  }

  if (currentTodo.attachment) {
    await deleteTodoAttachment(currentTodo.attachment.blobName);
  }

  const attachment = await uploadTodoAttachment(id, file);

  const updatedTodo: TodoItem = {
    ...currentTodo,
    attachment,
    updatedAt: new Date().toISOString(),
  };

  return updateTodoInStore(updatedTodo);
}

export async function removeFileFromTodo(id: string): Promise<TodoItem | null> {
  const settings = await getAppSettings();
  const currentTodoFromStore = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);
  const currentTodo = currentTodoFromStore
    ? normalizeTodo(currentTodoFromStore as PersistedTodoItem)
    : null;

  if (!currentTodo) {
    return null;
  }

  if (!currentTodo.attachment) {
    return currentTodo;
  }

  await deleteTodoAttachment(currentTodo.attachment.blobName);

  const updatedTodo: TodoItem = {
    ...currentTodo,
    attachment: undefined,
    updatedAt: new Date().toISOString(),
  };

  return updateTodoInStore(updatedTodo);
}
