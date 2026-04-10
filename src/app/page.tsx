import { TodoApp } from "@/components/todo-app";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(160deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
      <TodoApp />
    </div>
  );
}
