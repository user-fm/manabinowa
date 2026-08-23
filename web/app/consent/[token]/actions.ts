"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordAuditLog } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signConsent(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parentName = String(formData.get("parentName") ?? "").trim();
  const agreed = formData.get("agree") === "on";
  if (!token) redirect("/");
  if (!parentName || !agreed) redirect(`/consent/${token}?error=input`);

  const admin = createAdminClient();
  const { data: record } = await admin
    .from("consent_records")
    .select("id, student_id, status")
    .eq("token", token)
    .maybeSingle();
  if (!record || record.status === "signed") redirect(`/consent/${token}`);

  const h = await headers();
  const signerIp = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
  const { error: signError } = await admin
    .from("consent_records")
    .update({
      status: "signed",
      parent_name: parentName,
      signed_at: new Date().toISOString(),
      signer_ip: signerIp,
    })
    .eq("id", record.id)
    .eq("status", "pending");
  if (signError) {
    console.error("同意の記録失敗", signError.message);
    redirect(`/consent/${token}?error=db`);
  }

  // K-15: 生徒の全機能解放
  const { error: activateError } = await admin
    .from("users")
    .update({ account_status: "active" })
    .eq("id", record.student_id)
    .eq("role", "student")
    .eq("account_status", "pending");
  if (activateError) console.error("生徒の利用解放失敗", activateError.message);

  // K-09: 監査ログにも記録
  await recordAuditLog({
    eventType: "parent_consent_signed",
    actorType: "parent",
    actorLabel: parentName,
    targetId: record.id,
    detail: { student_id: record.student_id },
  });

  redirect(`/consent/${token}`);
}
