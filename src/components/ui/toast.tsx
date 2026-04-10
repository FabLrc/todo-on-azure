"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheck, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

function ToastProvider({ children, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider timeout={3500} limit={3} {...props}>
      {children}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  const { toasts } = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2",
        className,
      )}
      {...props}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </ToastPrimitive.Viewport>
  );
}

function Toast({
  toast,
  className,
}: {
  toast: ToastPrimitive.Root.ToastObject;
  className?: string;
}) {
  const isError = toast.type === "error";

  return (
    <ToastPrimitive.Root
      toast={toast}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5 shadow-lg backdrop-blur-sm",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
        "data-[ending]:animate-out data-[ending]:fade-out-0 data-[ending]:slide-out-to-right-full data-[ending]:duration-200",
        isError
          ? "border-rose-200 bg-rose-50/95 text-rose-900"
          : "border-emerald-200 bg-emerald-50/95 text-emerald-900",
        className,
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
      ) : (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      )}
      <ToastPrimitive.Title className="flex-1 text-sm font-medium" />
      <ToastPrimitive.Close
        className={cn(
          "shrink-0 rounded-md p-0.5 transition-colors",
          isError ? "hover:bg-rose-200/60" : "hover:bg-emerald-200/60",
        )}
      >
        <X className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

const useToastManager = ToastPrimitive.useToastManager;

export { ToastProvider, ToastViewport, Toast, useToastManager };
