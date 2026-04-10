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
import type { TodoItem } from "@/lib/types";
import { createTodoSchema, updateTodoSchema } from "@/lib/validation";

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
  return listTodosFromStore(settings.cosmos.partitionKeyValue);
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
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  return createTodoInStore(todo);
}

export async function updateTodo(id: string, input: unknown): Promise<TodoItem | null> {
  const settings = await getAppSettings();
  const currentTodo = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);
  if (!currentTodo) {
    return null;
  }

  const updates = updateTodoSchema.parse(input);

  const updatedTodo: TodoItem = {
    ...currentTodo,
    ...updates,
    dueDate: normalizeIsoDate(updates.dueDate) ?? currentTodo.dueDate,
    updatedAt: new Date().toISOString(),
  };

  return updateTodoInStore(updatedTodo);
}

export async function deleteTodo(id: string): Promise<boolean> {
  const settings = await getAppSettings();
  const currentTodo = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);

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
  const currentTodo = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);

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
  const currentTodo = await getTodoByIdFromStore(id, settings.cosmos.partitionKeyValue);

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
