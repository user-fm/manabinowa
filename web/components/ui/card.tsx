import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 一覧やフォームを囲む共通の枠。画面ごとに枠線と余白がばらつかないようにする。 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-surface p-5 shadow-sm", className)}
      {...props}
    />
  );
}

/** 見出し付きの区画。見出しの左に細い線を置いて区切りを分かりやすくする。 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <span className="h-4 w-0.5 rounded-full bg-brand" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
