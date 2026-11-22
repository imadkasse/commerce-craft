"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  setOpen: () => {},
});

function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children, className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DialogContext);
  return (
    <button
      className={cn("inline-flex items-center justify-center", className)}
      onClick={(e) => {
        onClick?.(e);
        setOpen(true);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function DialogContent({
  children,
  className,
  "aria-label": ariaLabel = "Dialog",
}: {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { open, setOpen } = React.useContext(DialogContext);
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-0 z-50 m-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-0 shadow-2xl backdrop:bg-black/50 open:animate-in open:fade-in-0",
        className
      )}
      onClose={() => setOpen(false)}
    >
      <div className="relative">
        <button
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6">
          {children}
        </div>
      </div>
    </dialog>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight text-gray-950", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-500", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6 border-t border-gray-100 mt-6", className)}
      {...props}
    />
  );
}

function DialogClose({ children, className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DialogContext);
  return (
    <button
      className={cn("inline-flex items-center justify-center", className)}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function useDialogContext() { return React.useContext(DialogContext); }

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, useDialogContext };