import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent-soft text-accent-strong",
        secondary: "border-transparent bg-gray-100 text-muted",
        destructive: "border-transparent bg-clay text-white shadow",
        outline: "text-muted border-line",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
