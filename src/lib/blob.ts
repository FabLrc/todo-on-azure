import "server-only";

import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

import { getAppSettings } from "@/lib/server-config";
import type { TodoAttachment } from "@/lib/types";
import { assertValidAttachment } from "@/lib/validation";

export interface TodoAttachmentContent {
  content: Buffer;
  contentType: string;
  contentLength: number;
}

let containerClientPromise: Promise<ContainerClient> | null = null;

async function readNodeStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function buildContainerClient(): Promise<ContainerClient> {
  const settings = await getAppSettings();

  const blobServiceClient = settings.storage.connectionString
    ? BlobServiceClient.fromConnectionString(settings.storage.connectionString)
    : new BlobServiceClient(
        `https://${settings.storage.accountName}.blob.core.windows.net`,
        new DefaultAzureCredential(),
      );

  const containerClient = blobServiceClient.getContainerClient(settings.storage.containerName);

  if (settings.storage.autoCreateContainer) {
    await containerClient.createIfNotExists();
  }

  return containerClient;
}

async function getContainerClient(): Promise<ContainerClient> {
  if (!containerClientPromise) {
    containerClientPromise = buildContainerClient();
  }

  return containerClientPromise;
}

export async function uploadTodoAttachment(todoId: string, file: File): Promise<TodoAttachment> {
  assertValidAttachment(file);

  const containerClient = await getContainerClient();
  const blobName = `${todoId}/${Date.now()}-${uuidv4()}-${sanitizeFileName(file.name)}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const payload = Buffer.from(await file.arrayBuffer());

  await blockBlobClient.uploadData(payload, {
    blobHTTPHeaders: {
      blobContentType: file.type || "application/octet-stream",
    },
  });

  return {
    blobName,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    url: blockBlobClient.url,
  };
}

export async function deleteTodoAttachment(blobName: string): Promise<void> {
  const containerClient = await getContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);
  await blobClient.deleteIfExists();
}

export async function getTodoAttachmentContent(blobName: string): Promise<TodoAttachmentContent | null> {
  const containerClient = await getContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);

  const exists = await blobClient.exists();
  if (!exists) {
    return null;
  }

  const downloadResponse = await blobClient.download();
  const content = downloadResponse.readableStreamBody
    ? await readNodeStreamToBuffer(downloadResponse.readableStreamBody)
    : Buffer.alloc(0);

  return {
    content,
    contentType: downloadResponse.contentType ?? "application/octet-stream",
    contentLength: downloadResponse.contentLength ?? content.length,
  };
}
