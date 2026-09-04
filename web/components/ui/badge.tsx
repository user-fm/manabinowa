import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "warn" | "danger" | "done";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-background text-muted",
  brand: "border-brand/30 bg-brand-soft text-brand-dark",
  warn: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-red-300 bg-red-50 text-red-700",
  done: "border-line bg-background text-muted line-through decoration-1",
};

/** 状態表示の小さなラベル。一覧の右端で使う。 */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** 依頼・セッションなどの状態から見た目のトーンを決める。 */
export function toneForStatus(status: string): Tone {
  if (["open", "offered", "scheduled", "pending"].includes(status)) return "warn";
  if (["matching", "in_progress", "accepted", "approved", "active"].includes(status))
    return "brand";
  if (["matched", "completed", "signed", "resolved"].includes(status)) return "done";
  if (["expired", "cancelled", "declined", "rejected"].includes(status)) return "neutral";
  return "neutral";
}
