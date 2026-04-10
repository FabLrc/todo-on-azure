import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createTodo, listTodos } from "@/lib/todo-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const todos = await listTodos();
    return NextResponse.json({ data: todos });
  } catch (error) {
    console.error("Unable to list todos", error);
    return NextResponse.json({ error: "Impossible de recuperer les taches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const todo = await createTodo(payload);

    return NextResponse.json({ data: todo }, { status: 201 });
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

    console.error("Unable to create todo", error);
    return NextResponse.json({ error: "Impossible de creer la tache." }, { status: 500 });
  }
}
