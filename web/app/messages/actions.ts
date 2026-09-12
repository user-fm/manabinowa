"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type Role, requireRole } from "@/lib/auth";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// Nフロー: 大人ロール同士の連絡。生徒は対象外(F-MSG)。
const ADULT_ROLES: Role[] = ["teacher", "volunteer", "community", "admin", "board"];

/** 自分がそのスレッドの参加者か確認する。参加者でなければ一覧へ戻す。 */
async function requireParticipant(threadId: string) {
  const profile = await requireRole(ADULT_ROLES);
  const admin = createAdminClient();
  const { data } = await admin
    .from("message_thread_participants")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!data) redirect("/messages");
  return { profile, admin };
}

/** N-03: スレッドへメッセージを送る。 */
export async function sendMessage(formData: FormData) {
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!threadId) redirect("/messages");
  if (!body) redirect(`/messages/${threadId}?error=empty`);
  if (body.length > 2000) redirect(`/messages/${threadId}?error=too_long`);

  const { profile, admin } = await requireParticipant(threadId);

  const { error } = await admin.from("messages").insert({
    thread_id: threadId,
    sender_id: profile.id,
    body,
  });
  if (error) {
    console.error("メッセージ送信失敗", error.message);
    redirect(`/messages/${threadId}?error=db`);
  }

  const { error: threadError } = await admin
    .from("message_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);
  if (threadError) console.error("スレッド更新失敗", threadError.message);

  // 同じスレッドの相手へ通知する(自分以外)。
  const { data: others } = await admin
    .from("message_thread_participants")
    .select("user_id")
    .eq("thread_id", threadId)
    .neq("user_id", profile.id);

  for (const row of others ?? []) {
    await sendEmailNotification({
      userId: row.user_id as string,
      category: "message",
      subject: "【まなびのわ】新しいメッセージが届きました",
      body: [
        `${profile.fullName} さんからメッセージが届きました。`,
        "",
        "アプリのメッセージ画面からご確認ください。",
      ].join("\n"),
    });
  }

  revalidatePath(`/messages/${threadId}`);
  redirect(`/messages/${threadId}`);
}

/** N-01: 相手を選んでスレッドを作る。既にある場合はそれを開く。 */
export async function startThread(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) redirect("/messages?error=partner");

  const profile = await requireRole(ADULT_ROLES);
  if (partnerId === profile.id) redirect("/messages?error=partner");

  const admin = createAdminClient();

  // 相手も大人ロールであることを確認する(生徒とは繋げない)。
  const { data: partner } = await admin
    .from("users")
    .select("id, role")
    .eq("id", partnerId)
    .maybeSingle();
  if (!partner || !ADULT_ROLES.includes(partner.role as Role)) {
    redirect("/messages?error=partner");
  }

  // 二人だけの既存スレッドがあれば再利用する。
  const { data: mine } = await admin
    .from("message_thread_participants")
    .select("thread_id")
    .eq("user_id", profile.id);
  const myThreadIds = (mine ?? []).map((row) => row.thread_id as string);

  if (myThreadIds.length > 0) {
    const { data: shared } = await admin
      .from("message_thread_participants")
      .select("thread_id")
      .eq("user_id", partnerId)
      .in("thread_id", myThreadIds);
    const existing = (shared ?? [])[0]?.thread_id as string | undefined;
    if (existing) redirect(`/messages/${existing}`);
  }

  const { data: thread, error } = await admin
    .from("message_threads")
    .insert({})
    .select("id")
    .single();
  if (error || !thread) {
    console.error("スレッド作成失敗", error?.message);
    redirect("/messages?error=db");
  }

  const { error: participantError } = await admin.from("message_thread_participants").insert([
    { thread_id: thread.id, user_id: profile.id },
    { thread_id: thread.id, user_id: partnerId },
  ]);
  if (participantError) {
    console.error("参加者登録失敗", participantError.message);
    redirect("/messages?error=db");
  }

  redirect(`/messages/${thread.id}`);
}
