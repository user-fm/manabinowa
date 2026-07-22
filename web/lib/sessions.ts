import { notFound, redirect } from "next/navigation";
import type { Profile } from "@/lib/auth";
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
