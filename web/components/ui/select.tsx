import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "mt-2 min-h-12 w-full rounded-md border border-line bg-surface px-3.5 text-sm font-medium outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft",
        className,
      )}
      {...props}
    />
  );
}
