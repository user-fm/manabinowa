"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { offerExpiryFromNow, runMatching } from "@/lib/matching";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** 依頼が操作中の教師のものか確認する(サーバ側の認可) */
async function requireOwnRequest(requestId: string) {
  const profile = await requireRole(["teacher"]);
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("id, teacher_id, school_id, subject, grade, detail, desired_at, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!request || request.teacher_id !== profile.id) redirect("/teacher/requests");
  return { profile, request, admin };
}

/** D-06〜D-09 の再実行。条件を見直したあとに候補を取り直す。 */
export async function regenerateCandidates(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect("/teacher/requests");
  await requireOwnRequest(requestId);

  await runMatching(requestId);
  redirect(`/teacher/requests/${requestId}?refreshed=1`);
}

/**
 * D-11/D-12: 教師が候補を選び、ボランティアへ依頼を提示する。
 * match_offers を作成し(承諾期限48時間)、メールで通知する。
 */
export async function offerToVolunteer(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const volunteerId = String(formData.get("volunteerId") ?? "");
  if (!requestId || !volunteerId) redirect("/teacher/requests");

  const { request, admin } = await requireOwnRequest(requestId);
  if (request.status === "matched" || request.status === "closed") {
    redirect(`/teacher/requests/${requestId}?error=closed`);
  }

  const { error } = await admin.from("match_offers").insert({
    request_id: requestId,
    volunteer_id: volunteerId,
    status: "offered",
    expires_at: offerExpiryFromNow(),
  });
  if (error) {
    console.error("依頼提示失敗", error.message);
    redirect(`/teacher/requests/${requestId}?error=offer`);
  }

  // 依頼は「調整中」へ。すでに調整中の場合も同じ値で問題ない。
  const { error: statusError } = await admin
    .from("volunteer_requests")
    .update({ status: "matching" })
    .eq("id", requestId)
    .eq("status", "open");
  if (statusError) console.error("依頼状態の更新失敗", statusError.message);

  // D-12: V へ依頼通知(Jフローの通知処理に相当)
  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", request.school_id)
    .maybeSingle();

  await sendEmailNotification({
    userId: volunteerId,
    category: "matching",
    subject: "【まなびのわ】学校から指導のご依頼が届きました",
    body: [
      `${school?.name ?? "学校"}から、指導のご依頼が届きました。`,
      "",
      `教科・学年: ${request.subject}（${request.grade}）`,
      `依頼内容: ${request.detail}`,
      "",
      "48時間以内に、まなびのわの「学校からの依頼」画面で承諾または辞退をお願いします。",
      "期限を過ぎると、ほかのボランティアへ依頼が回ります。",
    ].join("\n"),
  });

  redirect(`/teacher/requests/${requestId}?offered=1`);
}
