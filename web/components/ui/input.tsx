import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("mt-1 w-full rounded border p-2", className)} {...props} />;
}
