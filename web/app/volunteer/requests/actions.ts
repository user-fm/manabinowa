"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** 提示が操作中のボランティア本人宛か、まだ返答できる状態かを確認する */
async function requireOwnOffer(offerId: string) {
  const profile = await requireRole(["volunteer"]);
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("match_offers")
    .select(
      "id, status, expires_at, volunteer_id, request_id, volunteer_requests(id, teacher_id, school_id, subject, grade, detail, desired_at, status)",
    )
    .eq("id", offerId)
    .maybeSingle();

  if (!offer || offer.volunteer_id !== profile.id) redirect("/volunteer/requests");

  const request = offer.volunteer_requests as unknown as {
    id: string;
    teacher_id: string;
    school_id: string;
    subject: string;
    grade: string;
    detail: string;
    desired_at: string | null;
    status: string;
  } | null;
  if (!request) redirect("/volunteer/requests");

  if (offer.status !== "offered") redirect("/volunteer/requests?error=responded");
  if (new Date(offer.expires_at).getTime() < Date.now()) {
    redirect("/volunteer/requests?error=expired");
  }

  return { profile, admin, offer, request };
}

/**
 * D-13(Yes) → D-14/D-15: 承諾してセッションを作成する。
 * 同時承諾に備え、status='offered' の行だけを更新できたときのみ先へ進む。
 */
export async function acceptOffer(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  if (!offerId) redirect("/volunteer/requests");
  const { profile, admin, request } = await requireOwnOffer(offerId);

  if (request.status === "matched" || request.status === "closed") {
    redirect("/volunteer/requests?error=closed");
  }

  const { data: claimed, error: claimError } = await admin
    .from("match_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "offered")
    .select("id")
    .maybeSingle();
  if (claimError) {
    console.error("承諾失敗", claimError.message);
    redirect("/volunteer/requests?error=db");
  }
  if (!claimed) redirect("/volunteer/requests?error=responded");

  // E-08 の判定材料: この学校での担当が初めてかどうか。
  const { count: pastCount } = await admin
    .from("volunteer_sessions")
    .select("id", { count: "exact", head: true })
    .eq("volunteer_id", profile.id)
    .eq("school_id", request.school_id);

  // D-14: セッション作成
  const { data: session, error: sessionError } = await admin
    .from("volunteer_sessions")
    .insert({
      request_id: request.id,
      teacher_id: request.teacher_id,
      volunteer_id: profile.id,
      school_id: request.school_id,
      scheduled_at: request.desired_at,
      status: "scheduled",
      is_first: (pastCount ?? 0) === 0,
    })
    .select("id")
    .single();
  if (sessionError || !session) {
    console.error("セッション作成失敗", sessionError?.message);
    // 承諾は取り消して再操作できるようにする
    await admin.from("match_offers").update({ status: "offered" }).eq("id", offerId);
    redirect("/volunteer/requests?error=db");
  }

  const { error: requestError } = await admin
    .from("volunteer_requests")
    .update({ status: "matched" })
    .eq("id", request.id);
  if (requestError) console.error("依頼状態の更新失敗", requestError.message);

  // 成立した依頼に対する他の提示は返答不要にする。
  const { error: othersError } = await admin
    .from("match_offers")
    .update({ status: "expired", responded_at: new Date().toISOString() })
    .eq("request_id", request.id)
    .eq("status", "offered");
  if (othersError) console.error("他の提示の失効に失敗", othersError.message);

  // 教師へマッチング成立を通知(D-15 の前段)
  await sendEmailNotification({
    userId: request.teacher_id,
    category: "matching",
    subject: "【まなびのわ】ボランティアが依頼を承諾しました",
    body: [
      `「${request.subject}（${request.grade}）」のご依頼を、${profile.fullName}さんが承諾しました。`,
      "",
      "セッション画面から日程と当日の進め方をご確認ください。",
    ].join("\n"),
  });

  redirect(`/sessions/${session.id}`);
}

/** D-13(No): 辞退。教師は次の候補へ進む(D-10)。 */
export async function declineOffer(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  if (!offerId) redirect("/volunteer/requests");
  const { profile, admin, request } = await requireOwnOffer(offerId);

  const { data: claimed, error } = await admin
    .from("match_offers")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "offered")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("辞退の登録失敗", error.message);
    redirect("/volunteer/requests?error=db");
  }
  if (!claimed) redirect("/volunteer/requests?error=responded");

  await sendEmailNotification({
    userId: request.teacher_id,
    category: "matching",
    subject: "【まなびのわ】依頼が辞退されました",
    body: [
      `「${request.subject}（${request.grade}）」のご依頼について、${profile.fullName}さんが辞退されました。`,
      "",
      "依頼の詳細画面から、ほかの候補へ依頼を送ることができます。",
    ].join("\n"),
  });

  redirect("/volunteer/requests?declined=1");
}
