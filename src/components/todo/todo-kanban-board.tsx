import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todoPriorityLabels, todoStatusLabels, type TodoItem } from "@/lib/types";

import { getPriorityBadgeClass, getStatusBadgeClass, kanbanColumns, type KanbanColumnStatus } from "./todo-view-model";

interface TodoKanbanBoardProps {
  todosByColumn: Record<KanbanColumnStatus, TodoItem[]>;
  activeDropColumn: KanbanColumnStatus | null;
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  deletingTodoIds: Record<string, boolean>;
  highlightedTodoId: string | null;
  onColumnDragOver: (event: React.DragEvent<HTMLElement>, columnStatus: KanbanColumnStatus) => void;
  onColumnDrop: (event: React.DragEvent<HTMLElement>, columnStatus: KanbanColumnStatus) => void;
  onColumnDragLeave: (columnStatus: KanbanColumnStatus) => void;
  onCardDragStart: (event: React.DragEvent<HTMLElement>, todoId: string) => void;
  onCardDragEnd: () => void;
  onCardDragOver: (
    event: React.DragEvent<HTMLElement>,
    columnStatus: KanbanColumnStatus,
    overTodoId: string,
  ) => void;
  onCardDrop: (
    event: React.DragEvent<HTMLElement>,
    columnStatus: KanbanColumnStatus,
    beforeTodoId: string,
  ) => void;
  onDeleteTodo: (todoId: string) => void;
}

export function TodoKanbanBoard({
  todosByColumn,
  activeDropColumn,
  draggedTodoId,
  dragOverTodoId,
  deletingTodoIds,
  highlightedTodoId,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragLeave,
  onCardDragStart,
  onCardDragEnd,
  onCardDragOver,
  onCardDrop,
  onDeleteTodo,
}: TodoKanbanBoardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kanbanColumns.map((column) => {
        const columnTodos = todosByColumn[column.status];
        const isDropActive = activeDropColumn === column.status;

        return (
          <div
            key={column.status}
            className={`rounded-xl border p-3 transition-colors ${isDropActive ? "border-sky-300 bg-sky-50/70" : "border-slate-200 bg-white/80"}`}
            onDragOver={(event) => onColumnDragOver(event, column.status)}
            onDrop={(event) => onColumnDrop(event, column.status)}
            onDragLeave={() => onColumnDragLeave(column.status)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{column.title}</p>
                <p className="text-xs text-slate-500">{column.caption}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {columnTodos.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {columnTodos.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                  Glisser une tache ici
                </div>
              ) : null}

              {columnTodos.map((todo) => {
                const isCardDragging = draggedTodoId === todo.id;
                const isDeletingTodo = deletingTodoIds[todo.id] === true;
                const isHighlightedTodo = highlightedTodoId === todo.id;
                const isDropTargetCard = dragOverTodoId === todo.id && draggedTodoId !== todo.id;

                return (
                  <Card
                    key={todo.id}
                    draggable
                    onDragStart={(event) => onCardDragStart(event, todo.id)}
                    onDragOver={(event) => onCardDragOver(event, column.status, todo.id)}
                    onDrop={(event) => onCardDrop(event, column.status, todo.id)}
                    onDragEnd={onCardDragEnd}
                    className={`cursor-grab border-slate-200/90 transition-all duration-200 active:cursor-grabbing ${isCardDragging ? "scale-[0.99] opacity-70" : ""} ${isDropTargetCard ? "ring-2 ring-sky-300/70 -translate-y-0.5" : ""} ${isHighlightedTodo ? "ring-2 ring-sky-200" : ""} ${isDeletingTodo ? "pointer-events-none animate-out fade-out-0 zoom-out-95 slide-out-to-right-2 duration-200" : ""}`}
                  >
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{todo.title}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => onDeleteTodo(todo.id)}
                          aria-label={`Supprimer ${todo.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      {todo.description ? (
                        <p className="line-clamp-2 text-xs text-slate-500">{todo.description}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={getStatusBadgeClass(todo.status)}>{todoStatusLabels[todo.status]}</Badge>
                        <Badge className={getPriorityBadgeClass(todo.priority)}>{todoPriorityLabels[todo.priority]}</Badge>
                        {todo.dueDate ? (
                          <Badge variant="outline" className="text-[10px]">
                            {format(new Date(todo.dueDate), "dd MMM", { locale: fr })}
                          </Badge>
                        ) : null}
                      </div>

                      {todo.attachment ? (
                        <div className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                          <span className="truncate text-[11px] text-slate-600">{todo.attachment.fileName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={() => {
                              window.open(`/api/todos/${todo.id}/attachment?download=1`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Download className="size-3" />
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
