"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  side: "left" | "right" | "top" | "bottom";
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  setOpen: () => {},
  side: "right",
});

function Sheet({
  children,
  side = "right",
  ...props
}: { children: React.ReactNode; side?: "left" | "right" | "top" | "bottom" }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen, side }), [open, side]);
  return (
    <SheetContext.Provider value={value}>
      <div {...props}>{children}</div>
    </SheetContext.Provider>
  );
}

function SheetTrigger({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext);
  return (
    <button className={cn("inline-flex items-center justify-center", className)} onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  );
}

const sideStyles = {
  right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
  left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
};

function SheetContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, side } = React.useContext(SheetContext);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 cursor-default border-0 bg-black/50 p-0 text-left"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed z-50 gap-4 bg-surface p-6 shadow-lg transition ease-in-out",
          sideStyles[side],
          className
        )}
        {...props}
      >
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-gray-950", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4", className)} {...props} />;
}

function SheetClose({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext);
  return (
    <button className={cn("inline-flex items-center justify-center", className)} onClick={() => setOpen(false)} {...props}>
      {children}
    </button>
  );
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose };
