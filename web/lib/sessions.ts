import { notFound, redirect } from "next/navigation";
import type { Profile } from "@/lib/auth";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// オンライン指導セッション(Eフロー)の共通アクセス制御。
// 画面(app/sessions/[id]/page.tsx)と Server Actions の双方から使う。

export type SessionViewerRole = "teacher" | "volunteer" | "student" | "admin";

export type SessionRow = {
  id: string;
  teacher_id: string;
  volunteer_id: string;
  school_id: string;
  scheduled_at: string | null;
  status: string;
  meet_url: string | null;
  is_first: boolean;
  recording_required: boolean;
  recording_url: string | null;
  teacher_reflection: string | null;
  volunteer_reflection: string | null;
  ai_summary: string | null;
  volunteer_requests: { subject: string; grade: string; detail: string } | null;
};

const SESSION_COLUMNS =
  "id, teacher_id, volunteer_id, school_id, scheduled_at, status, meet_url, is_first, recording_required, recording_url, teacher_reflection, volunteer_reflection, ai_summary, volunteer_requests(subject, grade, detail)";

/**
 * セッションを取得し、閲覧権限を検証する。
 * 当事者(教師/ボランティア)・参加者(生徒)・自校の学校管理者のみ許可し、
 * それ以外はトップへリダイレクトする。
 */
export async function requireSessionAccess(
  sessionId: string,
  profile: Profile,
): Promise<{ session: SessionRow; viewerRole: SessionViewerRole }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("volunteer_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) notFound();

  const session = data as unknown as SessionRow;

  if (session.teacher_id === profile.id) return { session, viewerRole: "teacher" };
  if (session.volunteer_id === profile.id) return { session, viewerRole: "volunteer" };
  if (profile.role === "admin" && profile.schoolId === session.school_id) {
    return { session, viewerRole: "admin" };
  }

  const { data: participant } = await admin
    .from("session_participants")
    .select("user_id")
    .eq("session_id", sessionId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (participant) return { session, viewerRole: "student" };

  redirect("/");
}

/**
 * E-05: 24時間以内に予定されているセッションの参加者へリマインドを送る。
 * 二重送信を避けるため、送信済みは reminder_sent_at で記録する。
 * 外部の定期実行から /api/cron/session-reminders 経由で呼ぶ。
 */
export async function sendSessionReminders(): Promise<number> {
  const admin = createAdminClient();
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: sessions, error } = await admin
    .from("volunteer_sessions")
    .select("id, scheduled_at, teacher_id, volunteer_id, request_id")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", until.toISOString());
  if (error) {
    console.error("リマインド対象の取得失敗", error.message);
    return 0;
  }
  if (!sessions || sessions.length === 0) return 0;

  let sent = 0;
  for (const session of sessions) {
    const { data: request } = await admin
      .from("volunteer_requests")
      .select("subject, grade")
      .eq("id", session.request_id)
      .maybeSingle();

    // 生徒を含む参加者全員へ送る(教師・ボランティアは必ず対象)
    const { data: participants } = await admin
      .from("session_participants")
      .select("user_id")
      .eq("session_id", session.id);
    const recipients = new Set<string>([session.teacher_id, session.volunteer_id]);
    for (const p of participants ?? []) recipients.add(p.user_id);

    const when = session.scheduled_at
      ? new Date(session.scheduled_at).toLocaleString("ja-JP", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Tokyo",
        })
      : "日時未定";

    for (const userId of recipients) {
      await sendEmailNotification({
        userId,
        category: "session_reminder",
        subject: "【まなびのわ】まもなく指導セッションの予定です",
        body: [
          `${when} から指導セッションの予定です。`,
          request ? `教科・学年: ${request.subject}（${request.grade}）` : "",
          "",
          "セッション画面から会議リンクと当日の進め方をご確認ください。",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    const { error: markError } = await admin
      .from("volunteer_sessions")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", session.id);
    if (markError) console.error("リマインド記録の更新失敗", markError.message);
    else sent += 1;
  }

  return sent;
}
