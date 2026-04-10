import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { attachFileToTodo, removeFileFromTodo } from "@/lib/todo-service";
import { todoIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface TodoAttachmentRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: TodoAttachmentRouteContext) {
  try {
    const { id } = await context.params;
    const todoId = todoIdSchema.parse(id);

    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json({ error: "Le champ 'file' est obligatoire." }, { status: 400 });
    }

    const todo = await attachFileToTodo(todoId, uploadedFile);
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

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Unable to attach file", error);
    return NextResponse.json({ error: "Impossible d'ajouter la piece jointe." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: TodoAttachmentRouteContext) {
  try {
    const { id } = await context.params;
    const todoId = todoIdSchema.parse(id);

    const todo = await removeFileFromTodo(todoId);
    if (!todo) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ data: todo });
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

    console.error("Unable to remove attachment", error);
    return NextResponse.json({ error: "Impossible de supprimer la piece jointe." }, { status: 500 });
  }
}
