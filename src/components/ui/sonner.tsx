"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      offset={16}
      gap={10}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-line bg-surface text-gray-950 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-xs text-gray-500",
          actionButton: "rounded-md bg-accent px-2 py-1 text-xs font-medium text-white",
          cancelButton: "rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600",
          closeButton: "border-line bg-surface text-gray-400 hover:text-gray-900",
          success: "border-emerald-200 bg-emerald-50 text-emerald-900",
          error: "border-red-200 bg-red-50 text-red-900",
          warning: "border-amber-200 bg-amber-50 text-amber-900",
          info: "border-sky-200 bg-sky-50 text-sky-900",
          loading: "border-line bg-surface text-gray-900",
        },
        ...props.toastOptions,
      }}
      {...props}
    />
  );
}
