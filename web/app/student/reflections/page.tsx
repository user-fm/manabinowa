import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  scheduled_at: string | null;
  teacher_reflection: string | null;
  volunteer_reflection: string | null;
  ai_summary: string | null;
  volunteer_requests: { subject?: string; grade?: string } | null;
};

// E-13/E-14: 生徒が自分の受けた指導の振り返りを読む画面。
// 生徒自身は書かず、教師・ボランティアが残した内容とAI要約を確認する。
export default async function StudentReflectionsPage() {
  const profile = await requireRole(["student"]);

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("session_participants")
    .select(
      "volunteer_sessions(id, scheduled_at, teacher_reflection, volunteer_reflection, ai_summary, volunteer_requests(subject, grade))",
    )
    .eq("user_id", profile.id);

  const sessions = (rows ?? [])
    .map((row) => row.volunteer_sessions as unknown as SessionRow | null)
    .filter((s): s is SessionRow => s !== null)
    // 振り返りが1つでも書かれているセッションだけを新しい順で見せる
    .filter((s) => s.teacher_reflection || s.volunteer_reflection || s.ai_summary)
    .sort((a, b) => timeOf(b.scheduled_at) - timeOf(a.scheduled_at));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="生徒"
        title="振り返り"
        lead="受けた指導について、先生やボランティアの方が書いてくれた振り返りです。"
      />

      {sessions.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="note" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">まだ振り返りはありません</p>
          <p className="mt-2 text-xs font-medium text-muted">
            指導が終わると、その回の振り返りがここに並びます。
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-bold">
                    {s.volunteer_requests?.subject ?? "—"}（{s.volunteer_requests?.grade ?? "—"}）
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {fmtDateTime(s.scheduled_at)}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {s.teacher_reflection ? (
                    <div>
                      <h2 className="text-xs font-bold text-muted">先生から</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
                        {s.teacher_reflection}
                      </p>
                    </div>
                  ) : null}
                  {s.volunteer_reflection ? (
                    <div>
                      <h2 className="text-xs font-bold text-muted">ボランティアの方から</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
                        {s.volunteer_reflection}
                      </p>
                    </div>
                  ) : null}
                  {s.ai_summary ? (
                    <div className="rounded-md bg-brand-soft/60 p-4">
                      <h2 className="text-xs font-bold text-brand-dark">この回のまとめ</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
                        {s.ai_summary}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 border-t border-line pt-5">
                  <Link href={`/sessions/${s.id}`}>
                    <Button variant="outline">この回の詳細を見る</Button>
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** 日時未定(null)は一番後ろに送る */
function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}
