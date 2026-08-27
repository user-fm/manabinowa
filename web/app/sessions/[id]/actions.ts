"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireProfile } from "@/lib/auth";
import { moderateChatMessage } from "@/lib/safety";
import { requireSessionAccess } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";

// Eフロー: オンライン指導セッションの進行操作。
// E-07 入室 / E-08 録画要否の判定 / E-12 終了。

/**
 * E-07 入室。セッションを実施中にする。
 * あわせて E-08「初回かつ録画対応校か」を判定し、該当すれば録画必須を立てる(E-08a)。
 */
export async function enterSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  // 学校管理者は監査目的の閲覧のみ。進行操作はできない。
  if (viewerRole === "admin") redirect(`/sessions/${sessionId}?error=forbidden`);
  if (session.status === "completed" || session.status === "cancelled") {
    redirect(`/sessions/${sessionId}?error=closed`);
  }
  // 中断中のセッションは入室(=再開)させない。安全のため止めた状態を勝手に戻さない。
  // 解除は管理者がアラートを対応済みにしたとき(H-09)に行う。
  if (session.status === "paused") redirect(`/sessions/${sessionId}?error=paused`);

  const admin = createAdminClient();

  // 参加者行を確定させる。chat_messages の RLS は is_session_participant()
  // = session_participants の行の有無で判定するため、当事者でもこの行が無いと
  // チャットの閲覧・投稿ができない。
  const { error: participantError } = await admin
    .from("session_participants")
    .upsert(
      { session_id: sessionId, user_id: profile.id, role_in_session: viewerRole },
      { onConflict: "session_id,user_id" },
    );
  if (participantError) {
    console.error("セッション参加者登録失敗", participantError.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  const values: { status: string; recording_required?: boolean } = { status: "in_progress" };

  // E-08: 初回セッション かつ 録画対応校 のときだけ録画を必須にする。
  if (session.is_first && !session.recording_required) {
    const { data: school } = await admin
      .from("schools")
      .select("recording_enabled")
      .eq("id", session.school_id)
      .maybeSingle();
    if (school?.recording_enabled) values.recording_required = true;
  }

  const { error } = await admin.from("volunteer_sessions").update(values).eq("id", sessionId);
  if (error) {
    console.error("セッション入室失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

/** チャット本文の上限。DB 側の制約ではなく入力ガードとして持つ。 */
const CHAT_BODY_MAX = 2000;

/**
 * E-10 チャット送信。
 * E-11(AI による内容監視)は未接続のため ai_checked は false のまま積む。
 */
export async function sendChatMessage(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  // 空メッセージは認証・アクセス判定より前に弾く。空リクエストで毎回DBを叩かないため。
  if (!body) redirect(`/sessions/${sessionId}?error=empty_message`);

  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  // 学校管理者は閲覧のみ。終了・中止・中断中のセッションには投稿できない。
  if (viewerRole === "admin") redirect(`/sessions/${sessionId}?error=forbidden`);
  if (session.status === "completed" || session.status === "cancelled") {
    redirect(`/sessions/${sessionId}?error=closed`);
  }
  // 中断中はAI監視の想定外状態になるため投稿を止める。
  if (session.status === "paused") redirect(`/sessions/${sessionId}?error=paused`);
  if (body.length > CHAT_BODY_MAX) redirect(`/sessions/${sessionId}?error=too_long`);

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("chat_messages")
    .insert({ session_id: sessionId, sender_id: profile.id, body })
    .select("id")
    .single();
  if (error || !created) {
    console.error("チャット送信失敗", error?.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  // E-11 → H-01: AI監視(Hフロー)を並列起動する。
  // 応答を返したあとに実行し、チャットのリアルタイム配信を待たせない。
  after(async () => {
    await moderateChatMessage(created.id as number);
  });

  revalidatePath(`/sessions/${sessionId}`);
}

/**
 * E-13 振り返り入力。教師とボランティアがそれぞれ自分の欄だけを更新する。
 * E-14(AI要約)は未接続のため ai_summary は空のまま。
 */
export async function saveReflection(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const text = String(formData.get("reflection") ?? "").trim();
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  if (viewerRole !== "teacher" && viewerRole !== "volunteer") {
    redirect(`/sessions/${sessionId}?error=forbidden`);
  }
  if (session.status === "cancelled") redirect(`/sessions/${sessionId}?error=closed`);

  const column = viewerRole === "teacher" ? "teacher_reflection" : "volunteer_reflection";
  const admin = createAdminClient();
  const { error } = await admin
    .from("volunteer_sessions")
    .update({ [column]: text || null })
    .eq("id", sessionId);
  if (error) {
    console.error("振り返り保存失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?saved=reflection`);
}

/**
 * E-15a 録画リンクの手動登録。教師のみ。
 * 録画自体は Meet 側で行われるため、共有リンクを教師が貼る運用。
 */
export async function saveRecordingUrl(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const url = String(formData.get("recordingUrl") ?? "").trim();
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  if (viewerRole !== "teacher") redirect(`/sessions/${sessionId}?error=forbidden`);
  // 中止済みのセッションには録画リンクを登録させない。
  if (session.status === "cancelled") redirect(`/sessions/${sessionId}?error=closed`);

  // 空文字は登録解除として扱う。値がある場合は https のみ許可する。
  if (url) {
    let valid = false;
    try {
      valid = new URL(url).protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid) redirect(`/sessions/${sessionId}?error=invalid_url`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("volunteer_sessions")
    .update({ recording_url: url || null })
    .eq("id", sessionId);
  if (error) {
    console.error("録画リンク保存失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?saved=recording`);
}

/**
 * E-16 ボランティアの評価登録。教師のみ。
 * users.session_count / rating_avg はトリガ trg_vrev_stats が自動集計するため、
 * ここでは volunteer_reviews への登録だけを行う。
 */
export async function saveVolunteerReview(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  if (viewerRole !== "teacher") redirect(`/sessions/${sessionId}?error=forbidden`);
  // 評価は終了済みのセッションに対してのみ登録できる。
  if (session.status !== "completed") redirect(`/sessions/${sessionId}?error=closed`);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`/sessions/${sessionId}?error=invalid_rating`);
  }

  // volunteer_reviews.session_id は unique。再評価は上書きにする。
  const admin = createAdminClient();
  const { error } = await admin.from("volunteer_reviews").upsert(
    {
      session_id: sessionId,
      volunteer_id: session.volunteer_id,
      rating,
      comment: comment || null,
    },
    { onConflict: "session_id" },
  );
  if (error) {
    console.error("評価登録失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?saved=review`);
}

/** E-12 終了。教師のみがセッションを完了にできる。 */
export async function endSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  if (viewerRole !== "teacher") redirect(`/sessions/${sessionId}?error=forbidden`);
  if (session.status !== "in_progress") redirect(`/sessions/${sessionId}?error=not_running`);

  const admin = createAdminClient();
  const { error } = await admin
    .from("volunteer_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
  if (error) {
    console.error("セッション終了失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

/**
 * E-04: 会議リンクの登録。教師のみ。
 * Calendar API による自動発行ではなく教師が Meet で発行したリンクを貼る運用
 */
export async function saveMeetUrl(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const url = String(formData.get("meetUrl") ?? "").trim();
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(sessionId, profile);

  if (viewerRole !== "teacher") redirect(`/sessions/${sessionId}?error=forbidden`);
  if (session.status === "cancelled") redirect(`/sessions/${sessionId}?error=closed`);

  // 空文字は登録解除として扱う。値がある場合は https のみ許可する。
  if (url) {
    let valid = false;
    try {
      valid = new URL(url).protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid) redirect(`/sessions/${sessionId}?error=invalid_url`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("volunteer_sessions")
    .update({ meet_url: url || null })
    .eq("id", sessionId);
  if (error) {
    console.error("会議リンク保存失敗", error.message);
    redirect(`/sessions/${sessionId}?error=db`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?saved=meet`);
}
