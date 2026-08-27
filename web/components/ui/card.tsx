import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Tailwind preflight と body の背景色の組み合わせで、bg 指定のない要素は
// 下地のグラデーションが透ける。カード状の要素は必ずこのクラスを通す。
export const cardClass = "rounded-lg border border-gray-300 bg-white p-6";

// リンクカードなど、クリックできるカードに足すホバー表現。枠線の色だけを変える。
export const cardHoverClass = "transition-colors hover:border-[#155c38]";

// 「準備中」のプレースホルダ。白背景を持たせず下地を透かして非活性を示す。
export const cardPlaceholderClass = "rounded-lg border border-dashed border-gray-300 p-6";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(cardClass, className)} {...props} />;
}
