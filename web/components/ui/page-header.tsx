import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  /** 画面の分類(例: 教師 / 学校管理者)。省略可 */
  eyebrow?: string;
  title: string;
  lead?: string;
  /** 一覧などへ戻る導線 */
  back?: { href: string; label: string };
  action?: ReactNode;
};

/** 各画面の見出し。左の緑の帯で画面の始まりを揃える。 */
export function PageHeader({ eyebrow, title, lead, back, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {back ? (
        <Link
          href={back.href}
          className="text-sm font-medium text-muted transition-colors hover:text-brand-dark"
        >
          ← {back.label}
        </Link>
      ) : null}

      <div className={`flex items-end justify-between gap-4 ${back ? "mt-4" : ""}`}>
        <div className="flex items-center gap-3">
          <span className="h-9 w-1 shrink-0 rounded-full bg-brand" />
          <div>
            {eyebrow ? (
              <p className="text-xs font-bold tracking-wider text-muted">{eyebrow}</p>
            ) : null}
            <h1 className="text-2xl font-bold tracking-wide">{title}</h1>
          </div>
        </div>
        {action}
      </div>

      {lead ? <p className="mt-3 text-sm font-medium leading-7 text-muted">{lead}</p> : null}
    </div>
  );
}
