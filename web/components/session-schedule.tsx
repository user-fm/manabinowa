import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";

// D-16: 成立したセッションの予定一覧。教師・ボランティア双方の画面で使う。
// これからの予定は日付の早い順、終了済みは新しい順に並べる。

export type ScheduleItem = {
  id: string;
  scheduledAt: string | null;
  status: string;
  subject: string;
  grade: string;
  /** 相手方の表示名(教師なら担当ボランティア、ボランティアなら学校)。生徒画面では省略 */
  counterpart?: string;
};

const CLOSED_STATUSES = new Set(["completed", "cancelled"]);

export function SessionSchedule({ items }: { items: ScheduleItem[] }) {
  const upcoming = items
    .filter((s) => !CLOSED_STATUSES.has(s.status))
    .sort((a, b) => timeOf(a.scheduledAt) - timeOf(b.scheduledAt));
  const past = items
    .filter((s) => CLOSED_STATUSES.has(s.status))
    .sort((a, b) => timeOf(b.scheduledAt) - timeOf(a.scheduledAt));

  if (items.length === 0) {
    return (
      <Card className="border-dashed py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon name="video" className="size-6" />
        </span>
        <p className="mt-4 text-sm font-bold">セッションはまだありません</p>
        <p className="mt-2 text-xs font-medium text-muted">
          依頼が成立すると、ここに予定が表示されます。
        </p>
      </Card>
    );
  }

  return (
    <>
      <Section title="これからの予定" className="mt-0">
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-muted">
            予定されているセッションはありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((s) => (
              <ScheduleRow key={s.id} item={s} />
            ))}
          </ul>
        )}
      </Section>

      {past.length > 0 ? (
        <Section title="終了したセッション">
          <ul className="mt-3 space-y-3">
            {past.map((s) => (
              <ScheduleRow key={s.id} item={s} />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  return (
    <li>
      <Link href={`/sessions/${item.id}`} className="block">
        <Card className="transition-all hover:border-brand hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon name="video" className="size-5" />
              </span>
              <span className="text-base font-bold">
                {item.subject}（{item.grade}）
              </span>
            </span>
            <Badge tone={toneForStatus(item.status)}>
              {SESSION_STATUS_LABEL[item.status] ?? item.status}
            </Badge>
          </div>
          <p className="mt-3 text-xs font-medium text-muted">
            日時: {fmtDateTime(item.scheduledAt)}
            {item.counterpart ? ` ／ ${item.counterpart}` : null}
          </p>
        </Card>
      </Link>
    </li>
  );
}

/** 日時未定(null)は一番後ろに送る */
function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}
