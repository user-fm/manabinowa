import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "quiet";
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-md px-5 text-sm font-bold transition-colors disabled:opacity-50",
        variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-dark",
        variant === "outline" &&
          "border border-line bg-surface hover:border-brand hover:bg-brand-soft",
        variant === "quiet" && "text-brand-dark hover:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}
