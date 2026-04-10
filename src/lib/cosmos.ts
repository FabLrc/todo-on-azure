import "server-only";

import { CosmosClient, type Container, type SqlQuerySpec } from "@azure/cosmos";

import { getAppSettings } from "@/lib/server-config";
import type { TodoItem } from "@/lib/types";

let containerPromise: Promise<Container> | null = null;

async function buildContainer(): Promise<Container> {
  const settings = await getAppSettings();
  const client = new CosmosClient({
    endpoint: settings.cosmos.endpoint,
    key: settings.cosmos.key,
  });

  if (settings.cosmos.autoCreate) {
    const { database } = await client.databases.createIfNotExists({
      id: settings.cosmos.databaseName,
    });

    await database.containers.createIfNotExists({
      id: settings.cosmos.containerName,
      partitionKey: {
        paths: ["/partitionKey"],
      },
    });
  }

  const database = client.database(settings.cosmos.databaseName);
  return database.container(settings.cosmos.containerName);
}

async function getContainer(): Promise<Container> {
  if (!containerPromise) {
    containerPromise = buildContainer();
  }

  return containerPromise;
}

export async function listTodosFromStore(partitionKeyValue: string): Promise<TodoItem[]> {
  const container = await getContainer();
  const query: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.createdAt DESC",
    parameters: [{ name: "@partitionKey", value: partitionKeyValue }],
  };

  const { resources } = await container.items.query<TodoItem>(query).fetchAll();
  return resources;
}

export async function createTodoInStore(todo: TodoItem): Promise<TodoItem> {
  const container = await getContainer();
  const { resource } = await container.items.create<TodoItem>(todo);

  if (!resource) {
    throw new Error("Impossible de creer la tache dans Cosmos DB.");
  }

  return resource;
}

export async function getTodoByIdFromStore(
  id: string,
  partitionKeyValue: string,
): Promise<TodoItem | null> {
  const container = await getContainer();

  try {
    const { resource } = await container.item(id, partitionKeyValue).read<TodoItem>();
    return resource ?? null;
  } catch (error) {
    const statusCode = (error as { code?: number; statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return null;
    }

    throw error;
  }
}

export async function updateTodoInStore(todo: TodoItem): Promise<TodoItem> {
  const container = await getContainer();
  const { resource } = await container.item(todo.id, todo.partitionKey).replace<TodoItem>(todo);

  if (!resource) {
    throw new Error("Impossible de mettre a jour la tache dans Cosmos DB.");
  }

  return resource;
}

export async function deleteTodoFromStore(id: string, partitionKeyValue: string): Promise<void> {
  const container = await getContainer();

  try {
    await container.item(id, partitionKeyValue).delete();
  } catch (error) {
    const statusCode = (error as { code?: number; statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return;
    }

    throw error;
  }
}
