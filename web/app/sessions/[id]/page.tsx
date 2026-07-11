import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("volunteer_sessions")
    .select(
      "id, teacher_id, volunteer_id, school_id, scheduled_at, status, meet_url, volunteer_requests(subject, grade, detail)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  // アクセス制御: 当事者(教師/ボランティア)・参加者(生徒)・自校の学校管理者のみ
  let allowed = session.teacher_id === profile.id || session.volunteer_id === profile.id;
  if (!allowed && profile.role === "admin" && profile.schoolId === session.school_id) {
    allowed = true;
  }
  if (!allowed) {
    const { data: participant } = await admin
      .from("session_participants")
      .select("user_id")
      .eq("session_id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    allowed = Boolean(participant);
  }
  if (!allowed) redirect("/");

  const req = session.volunteer_requests as {
    subject?: string;
    grade?: string;
    detail?: string;
  } | null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">
        オンライン指導：{req?.subject ?? "—"}（{req?.grade ?? "—"}）
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        日時: {fmtDateTime(session.scheduled_at)} ／ 状態:{" "}
        {SESSION_STATUS_LABEL[session.status] ?? session.status}
      </p>

      <section className="mt-6 rounded border p-4">
        <h2 className="text-sm font-medium text-gray-500">内容</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{req?.detail ?? "—"}</p>
      </section>

      <section className="mt-4 rounded border p-4">
        <h2 className="text-sm font-medium text-gray-500">ビデオ会議</h2>
        {session.meet_url ? (
          <a
            href={session.meet_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-blue-700 underline"
          >
            Meet に参加する
          </a>
        ) : (
          <p className="mt-2 text-sm text-gray-500">会議リンクは未設定です（自動発行は準備中）。</p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded border border-dashed p-4 text-sm text-gray-400">
          チャット（準備中）
        </div>
        <div className="rounded border border-dashed p-4 text-sm text-gray-400">
          ホワイトボード（準備中）
        </div>
        <div className="rounded border border-dashed p-4 text-sm text-gray-400">
          振り返り・AI要約（準備中）
        </div>
        <div className="rounded border border-dashed p-4 text-sm text-gray-400">
          録画リンク（準備中）
        </div>
      </div>
    </main>
  );
}
