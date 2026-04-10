import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getTodoAttachmentContent } from "@/lib/blob";
import { attachFileToTodo, getTodoById, removeFileFromTodo } from "@/lib/todo-service";
import { todoIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface TodoAttachmentRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: TodoAttachmentRouteContext) {
  try {
    const { id } = await context.params;
    const todoId = todoIdSchema.parse(id);
    const searchParams = new URL(request.url).searchParams;
    const forceDownload = searchParams.get("download") === "1";

    const todo = await getTodoById(todoId);
    if (!todo) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    if (!todo.attachment) {
      return NextResponse.json({ error: "Aucune piece jointe pour cette tache." }, { status: 404 });
    }

    const attachmentContent = await getTodoAttachmentContent(todo.attachment.blobName);
    if (!attachmentContent) {
      return NextResponse.json({ error: "Piece jointe introuvable." }, { status: 404 });
    }

    const encodedFileName = encodeURIComponent(todo.attachment.fileName);
    const responseBody = new Uint8Array(attachmentContent.content);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": String(attachmentContent.contentLength),
        "Content-Type": attachmentContent.contentType,
      },
    });
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

    console.error("Unable to read attachment", error);
    return NextResponse.json({ error: "Impossible de recuperer la piece jointe." }, { status: 500 });
  }
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
