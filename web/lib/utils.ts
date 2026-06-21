import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui 互換の className 結合ヘルパ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
