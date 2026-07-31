import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("mt-1 w-full rounded border p-2", className)} {...props} />;
}
