"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { TodoItem } from "@/lib/types";

interface TodoFormState {
  title: string;
  description: string;
  dueDate: string;
}

const defaultForm: TodoFormState = {
  title: "",
  description: "",
  dueDate: "",
};

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
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [formState, setFormState] = useState<TodoFormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/todos", {
        cache: "no-store",
      });
      const data = await parseApiResponse<TodoItem[]>(response);
      setTodos(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les taches.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  async function handleCreateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const createdTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) => [createdTodo, ...previousTodos]);
      setFormState(defaultForm);
      setMessage("Tache creee avec succes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de creer la tache.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTodo(todo: TodoItem, checked: boolean) {
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: checked ? "done" : "pending",
        }),
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de mettre a jour la tache.");
    }
  }

  async function handleDeleteTodo(todoId: string) {
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Impossible de supprimer la tache.");
      }

      setTodos((previousTodos) => previousTodos.filter((todo) => todo.id !== todoId));
      setMessage("Tache supprimee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de supprimer la tache.");
    }
  }

  async function handleAttachmentUpload(todoId: string, file: File) {
    setErrorMessage(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/todos/${todoId}/attachment`, {
        method: "POST",
        body: formData,
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      setMessage("Piece jointe ajoutee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'ajouter la piece jointe.");
    }
  }

  async function handleAttachmentDelete(todoId: string) {
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/todos/${todoId}/attachment`, {
        method: "DELETE",
      });

      const updatedTodo = await parseApiResponse<TodoItem>(response);
      setTodos((previousTodos) =>
        previousTodos.map((existingTodo) => (existingTodo.id === updatedTodo.id ? updatedTodo : existingTodo)),
      );
      setMessage("Piece jointe supprimee.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de supprimer la piece jointe.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Azure Todo MVP</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Todo App avec Azure</h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          Cette iteration fournit le socle Next.js + shadcn/ui avec API CRUD, stockage Cosmos DB, pieces
          jointes Blob Storage et lecture des secrets via Key Vault.
        </p>
      </header>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle>Nouvelle tache</CardTitle>
          <CardDescription>Ajoutez un titre, une description et une date cible optionnelle.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTodo} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    title: event.target.value,
                  }))
                }
                placeholder="Ex: Ajouter le monitoring App Service"
                required
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    description: event.target.value,
                  }))
                }
                placeholder="Details de la tache"
                maxLength={500}
              />
            </div>
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="dueDate">Date cible</Label>
              <Input
                id="dueDate"
                type="date"
                value={formState.dueDate}
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Creation...
                  </span>
                ) : (
                  "Ajouter la tache"
                )}
              </Button>
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-slate-900">Liste des taches</h2>
          <Button variant="outline" onClick={() => void loadTodos()} disabled={isLoading}>
            Rafraichir
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="size-4 animate-spin" />
            Chargement des taches...
          </div>
        ) : null}

        {!isLoading && todos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-slate-600">
              Aucune tache pour le moment. Creez-en une pour commencer.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3">
          {todos.map((todo) => {
            const isDone = todo.status === "done";

            return (
              <Card key={todo.id} className="border-slate-200/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={(checked) => {
                            void handleToggleTodo(todo, checked === true);
                          }}
                          aria-label={`Basculer le statut de ${todo.title}`}
                        />
                        <CardTitle className={isDone ? "line-through text-slate-500" : "text-slate-900"}>
                          {todo.title}
                        </CardTitle>
                        <Badge variant={isDone ? "secondary" : "default"}>
                          {isDone ? "Terminee" : "En cours"}
                        </Badge>
                      </div>
                      {todo.description ? <CardDescription>{todo.description}</CardDescription> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDeleteTodo(todo.id)}
                      aria-label={`Supprimer ${todo.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Creee le {format(new Date(todo.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                    {todo.dueDate ? (
                      <Badge variant="outline">
                        Echeance {format(new Date(todo.dueDate), "dd MMM yyyy", { locale: fr })}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Label
                      htmlFor={`attachment-${todo.id}`}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm"
                    >
                      <Paperclip className="size-4" />
                      Joindre un fichier
                    </Label>
                    <Input
                      id={`attachment-${todo.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0];
                        if (!selectedFile) {
                          return;
                        }

                        void handleAttachmentUpload(todo.id, selectedFile);
                        event.target.value = "";
                      }}
                    />
                    {todo.attachment ? (
                      <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5">
                        <span className="text-xs">
                          {todo.attachment.fileName} ({Math.ceil(todo.attachment.size / 1024)} KB)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => void handleAttachmentDelete(todo.id)}
                        >
                          Retirer
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Aucune piece jointe</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
