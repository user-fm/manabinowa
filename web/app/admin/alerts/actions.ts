"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// H-09: 管理者がアラートを確認し、対応を決める。
// ブロックが必要と判断した場合は block_list に申請を作り、Iフロー(I-01)へ渡す。

/** アラートが操作中の管理者の学校のものか確認する */
async function requireOwnAlert(alertId: string) {
  const profile = await requireRole(["admin"]);
  const admin = createAdminClient();
  const { data: alert } = await admin
    .from("safety_alerts")
    .select("id, session_id, school_id, volunteer_id, level, status")
    .eq("id", alertId)
    .maybeSingle();
  if (!alert || !profile.schoolId || alert.school_id !== profile.schoolId) {
    redirect("/admin/alerts");
  }
  return { profile, admin, alert };
}

/** H-09: 内容を確認した(対応中)。 */
export async function acknowledgeAlert(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "");
  if (!alertId) redirect("/admin/alerts");
  const { profile, admin, alert } = await requireOwnAlert(alertId);

  if (alert.status !== "open") redirect("/admin/alerts?error=responded");

  const { error } = await admin
    .from("safety_alerts")
    .update({
      status: "acknowledged",
      handled_by: profile.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("status", "open");
  if (error) {
    console.error("アラートの確認登録失敗", error.message);
    redirect("/admin/alerts?error=db");
  }

  await recordAuditLog({
    eventType: "safety_alert_acknowledged",
    actorType: "user",
    actorId: profile.id,
    actorLabel: profile.fullName,
    sessionId: alert.session_id,
    targetId: alertId,
    alertLevel: alert.level as "low" | "medium" | "high" | "urgent",
  });

  revalidatePath("/admin/alerts");
  redirect("/admin/alerts?saved=acknowledged");
}

/** H-09: 対応を完了した。 */
export async function resolveAlert(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "");
  if (!alertId) redirect("/admin/alerts");
  const { profile, admin, alert } = await requireOwnAlert(alertId);

  if (alert.status === "resolved") redirect("/admin/alerts?error=responded");

  const { error } = await admin
    .from("safety_alerts")
    .update({
      status: "resolved",
      handled_by: profile.id,
      acknowledged_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .neq("status", "resolved");
  if (error) {
    console.error("アラートの対応登録失敗", error.message);
    redirect("/admin/alerts?error=db");
  }

  await recordAuditLog({
    eventType: "safety_alert_resolved",
    actorType: "user",
    actorId: profile.id,
    actorLabel: profile.fullName,
    sessionId: alert.session_id,
    targetId: alertId,
    alertLevel: alert.level as "low" | "medium" | "high" | "urgent",
  });

  revalidatePath("/admin/alerts");
  redirect("/admin/alerts?saved=resolved");
}

/**
 * H-09 → I-01: ブロックが必要と判断した場合の申請。
 * 運営(operators)の審査を経て確定するため、ここでは pending の申請行のみ作る。
 */
export async function requestBlock(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!alertId) redirect("/admin/alerts");
  const { profile, admin, alert } = await requireOwnAlert(alertId);

  if (!reason) redirect("/admin/alerts?error=reason");

  // 同じボランティアの申請が審査中・承認済みなら重ねて作らない
  const { data: existing } = await admin
    .from("block_list")
    .select("id, status")
    .eq("volunteer_id", alert.volunteer_id)
    .eq("school_id", alert.school_id)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (existing) redirect("/admin/alerts?error=block_exists");

  const { data: block, error } = await admin
    .from("block_list")
    .insert({
      volunteer_id: alert.volunteer_id,
      school_id: alert.school_id,
      requested_by: profile.id,
      reason,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !block) {
    console.error("ブロック申請失敗", error?.message);
    redirect("/admin/alerts?error=db");
  }

  // 申請したアラートは対応中として扱う
  const { error: alertError } = await admin
    .from("safety_alerts")
    .update({
      status: "acknowledged",
      handled_by: profile.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("status", "open");
  if (alertError) console.error("アラートの状態更新失敗", alertError.message);

  await recordAuditLog({
    eventType: "block_requested",
    actorType: "user",
    actorId: profile.id,
    actorLabel: profile.fullName,
    sessionId: alert.session_id,
    targetId: block.id,
    alertLevel: alert.level as "low" | "medium" | "high" | "urgent",
    detail: { alert_id: alertId, volunteer_id: alert.volunteer_id, reason },
  });

  revalidatePath("/admin/alerts");
  revalidatePath("/admin/blocks");
  redirect("/admin/alerts?saved=block");
}
