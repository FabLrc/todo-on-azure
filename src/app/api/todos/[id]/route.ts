import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deleteTodo, updateTodo } from "@/lib/todo-service";
import { todoIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface TodoRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: TodoRouteContext) {
  try {
    const { id } = await context.params;
    const todoId = todoIdSchema.parse(id);
    const payload = await request.json();

    const todo = await updateTodo(todoId, payload);
    if (!todo) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ data: todo });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Donnees invalides.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Unable to update todo", error);
    return NextResponse.json({ error: "Impossible de mettre a jour la tache." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: TodoRouteContext) {
  try {
    const { id } = await context.params;
    const todoId = todoIdSchema.parse(id);
    const isDeleted = await deleteTodo(todoId);

    if (!isDeleted) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Identifiant invalide.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Unable to delete todo", error);
    return NextResponse.json({ error: "Impossible de supprimer la tache." }, { status: 500 });
  }
}
