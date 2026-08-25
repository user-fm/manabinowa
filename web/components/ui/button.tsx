import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "outline";
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded px-4 py-2 text-sm transition-colors disabled:opacity-50",
        variant === "primary" && "bg-[#155c38] text-white hover:bg-[#124c2f]",
        variant === "outline" && "border hover:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
}
