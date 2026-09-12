import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "mt-2 w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm font-medium outline-none transition-colors placeholder:font-normal placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand-soft";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(base, "min-h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(base, "leading-7", className)} {...props} />;
}
