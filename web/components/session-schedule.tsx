import Link from "next/link";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";

// D-16: 成立したセッションの予定一覧。教師・ボランティア双方の画面で使う。
// これからの予定は日付の早い順、終了済みは新しい順に並べる。

export type ScheduleItem = {
  id: string;
  scheduledAt: string | null;
  status: string;
  subject: string;
  grade: string;
  /** 相手方の表示名(教師なら担当ボランティア、ボランティアなら学校) */
  counterpart: string;
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
      <p className="mt-6 text-sm text-gray-500">
        セッションはまだありません。依頼が成立するとここに表示されます。
      </p>
    );
  }

  return (
    <>
      <section className="mt-6">
        <h2 className="font-medium">これからの予定</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">予定されているセッションはありません。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((s) => (
              <ScheduleRow key={s.id} item={s} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-medium">終了したセッション</h2>
          <ul className="mt-3 space-y-3">
            {past.map((s) => (
              <ScheduleRow key={s.id} item={s} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  return (
    <li>
      <Link href={`/sessions/${item.id}`} className="block rounded border p-4 hover:bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {item.subject}（{item.grade}）
          </span>
          <span className="text-xs text-gray-500">
            {SESSION_STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          日時: {fmtDateTime(item.scheduledAt)} ／ {item.counterpart}
        </p>
      </Link>
    </li>
  );
}

/** 日時未定(null)は一番後ろに送る */
function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}
