"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenuContext = React.createContext<{ close: () => void }>({
  close: () => {},
});

function DropdownMenu({ children, ...props }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block text-left" {...props}>
      {children}
    </div>
  );
}

function DropdownMenuTrigger({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ close: () => setOpen(false) }}>
      <div ref={ref} className="relative inline-block">
        <button
          className={cn("inline-flex items-center justify-center", className)}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          {...props}
        >
          {children}
        </button>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && (child as { props?: { __dropdownContent?: React.ReactNode } }).props?.__dropdownContent) {
            return open ? (child as { props: { __dropdownContent: React.ReactNode } }).props.__dropdownContent : null;
          }
          return null;
        })}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}

function DropdownMenuContent({ children, className, ...props }: DropdownMenuContentProps) {
  return (
    <div
      className={cn(
        "absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-line bg-surface p-1 text-gray-950 shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  children,
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { close } = React.useContext(DropdownMenuContext);
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent-soft/50 focus:bg-accent-soft/50",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          close();
        }
      }}
      role="menuitem"
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-gray-200", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
