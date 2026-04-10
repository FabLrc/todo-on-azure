import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ClipboardList, Download, Eye, EyeOff, Paperclip, Plus, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  todoPriorityLabels,
  todoPriorityValues,
  todoStatusLabels,
  todoStatusValues,
  type TodoItem,
  type TodoPriority,
  type TodoStatus,
} from "@/lib/types";

import {
  formatAttachmentSize,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  inferAttachmentPreviewKind,
} from "./todo-view-model";

interface TodoListViewProps {
  todos: TodoItem[];
  totalTodos: number;
  isLoading: boolean;
  uploadingTodoIds: Record<string, boolean>;
  uploadProgressByTodoId: Record<string, number>;
  deletingTodoIds: Record<string, boolean>;
  highlightedTodoId: string | null;
  recentlyCreatedTodoId: string | null;
  expandedAttachments: Set<string>;
  confirmingDeleteId: string | null;
  onOpenCreateForm: () => void;
  onResetFilters: () => void;
  onToggleTodo: (todo: TodoItem, checked: boolean) => void;
  onUpdateTodo: (todoId: string, updates: Partial<TodoItem>) => void;
  onDeleteClick: (todoId: string) => void;
  onAttachmentUpload: (todoId: string, file: File) => void;
  onToggleAttachmentPreview: (todoId: string) => void;
  onAttachmentDelete: (todoId: string) => void;
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

export function TodoListView({
  todos,
  totalTodos,
  isLoading,
  uploadingTodoIds,
  uploadProgressByTodoId,
  deletingTodoIds,
  highlightedTodoId,
  recentlyCreatedTodoId,
  expandedAttachments,
  confirmingDeleteId,
  onOpenCreateForm,
  onResetFilters,
  onToggleTodo,
  onUpdateTodo,
  onDeleteClick,
  onAttachmentUpload,
  onToggleAttachmentPreview,
  onAttachmentDelete,
}: TodoListViewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3">
        <TodoCardSkeleton />
        <TodoCardSkeleton />
        <TodoCardSkeleton />
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardList className="mb-3 size-12 text-slate-300" />
        {totalTodos === 0 ? (
          <>
            <p className="text-base font-medium text-slate-500">Aucune tache</p>
            <p className="mt-1 text-sm text-slate-400">Commencez par creer votre premiere tache.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onOpenCreateForm}>
              <Plus className="size-4" />
              Creer une tache
            </Button>
          </>
        ) : (
          <>
            <p className="text-base font-medium text-slate-500">Aucun resultat</p>
            <p className="mt-1 text-sm text-slate-400">Aucune tache ne correspond a vos filtres.</p>
            <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={onResetFilters}>
              <RotateCcw className="size-3" />
              Reinitialiser les filtres
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {todos.map((todo, index) => {
        const isDone = todo.status === "done";
        const isUploadingAttachment = uploadingTodoIds[todo.id] === true;
        const isDeletingTodo = deletingTodoIds[todo.id] === true;
        const isHighlightedTodo = highlightedTodoId === todo.id;
        const isRecentlyCreated = recentlyCreatedTodoId === todo.id;
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
            className={`border-slate-200/80 transition-all duration-200 hover:border-slate-300 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both ${isDone ? "opacity-60" : ""} ${isHighlightedTodo ? "ring-2 ring-sky-200" : ""} ${isRecentlyCreated ? "scale-[1.01]" : ""} ${isDeletingTodo ? "pointer-events-none animate-out fade-out-0 zoom-out-95 slide-out-to-right-2 duration-200" : ""}`}
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={(checked) => {
                        onToggleTodo(todo, checked === true);
                      }}
                      aria-label={`Basculer le statut de ${todo.title}`}
                    />
                    <CardTitle
                      className={`transition-all duration-300 ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}
                    >
                      {todo.title}
                    </CardTitle>

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
                            onUpdateTodo(todo.id, { status: value as TodoStatus });
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
                            onUpdateTodo(todo.id, { priority: value as TodoPriority });
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
                  {todo.description ? <CardDescription className="pl-6">{todo.description}</CardDescription> : null}
                </div>

                <Button
                  variant={isConfirmingDelete ? "destructive" : "ghost"}
                  size={isConfirmingDelete ? "sm" : "icon"}
                  onClick={() => onDeleteClick(todo.id)}
                  aria-label={`Supprimer ${todo.title}`}
                  className={`shrink-0 transition-all ${isConfirmingDelete ? "h-8 px-3 text-xs" : ""}`}
                >
                  {isConfirmingDelete ? "Supprimer ?" : <Trash2 className="size-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-slate-500">
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <span className="text-xs">{format(new Date(todo.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                {todo.dueDate ? (
                  <Badge variant="outline" className="text-xs">
                    Echeance {format(new Date(todo.dueDate), "dd MMM yyyy", { locale: fr })}
                  </Badge>
                ) : null}
              </div>

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

                      onAttachmentUpload(todo.id, selectedFile);
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
                        onClick={() => onToggleAttachmentPreview(todo.id)}
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
                        onClick={() => onAttachmentDelete(todo.id)}
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
                      <p className="p-1 text-xs text-slate-500">Apercu non disponible pour ce type de fichier.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
