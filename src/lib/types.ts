export type TodoStatus = "pending" | "done";

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
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  attachment?: TodoAttachment;
}
