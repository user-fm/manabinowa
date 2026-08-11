"use server";

import { redirect } from "next/navigation";
import { classifyUserByEmail, isRoleAllowedFor } from "@/lib/auth/classify-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 学校の紐付けが必須なロール。board(教育委員会)は特定校に属さないため対象外。
const SCHOOL_REQUIRED_ROLES = ["teacher", "student", "admin"];

/**
 * B-10〜B-18: オンボーディング登録処理。
 * 所属校はメールドメインの判定結果から決める(フォーム値は信頼しない)。
 */
export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const parentEmail = String(formData.get("parentEmail") ?? "").trim();

  // メールドメインの校内/個人判定と選択ロールが一致するかをサーバー側で再検証。
  // (クライアントの絞り込みは改ざん可能なため、書き込み前にここで必ず弾く)
  const classification = await classifyUserByEmail(user.email);
  if (!isRoleAllowedFor(role, classification)) {
    redirect("/onboarding/profile?error=role");
  }
  if (!fullName) {
    redirect("/onboarding/profile?error=invalid");
  }

  // B-11/B-12: 生徒は保護者メールが必須。users 作成前に検証する
  // (作成後に弾くと、再送信が id 重複で必ず失敗するため)。
  if (role === "student" && !parentEmail) {
    redirect("/onboarding/profile?error=parent");
  }

  const admin = createAdminClient();

  // 所属校はドメイン判定の結果から決める(B-08)。
  let finalSchoolId: string | null = null;
  let municipalityCode: string | null = null;
  if (SCHOOL_REQUIRED_ROLES.includes(role)) {
    if (classification.kind !== "school") redirect("/onboarding/profile?error=school");
    const { data: school } = await admin
      .from("schools")
      .select("id, municipality_code")
      .eq("id", classification.school.id)
      .maybeSingle();
    if (!school) redirect("/onboarding/profile?error=school");
    finalSchoolId = school.id;
    municipalityCode = school.municipality_code;
  }

  // B-15/B-16: volunteer / community は運営審査を経るまで pending。
  const accountStatus = role === "volunteer" || role === "community" ? "pending" : "active";

  const { error: insertError } = await admin.from("users").insert({
    id: user.id,
    role,
    account_status: accountStatus,
    full_name: fullName,
    email: user.email,
    school_id: finalSchoolId,
    municipality_code: municipalityCode,
  });
  if (insertError) {
    console.error("ユーザー登録失敗", insertError.message);
    redirect("/onboarding/profile?error=db");
  }

  // B-11/B-12: 生徒は保護者同意レコードを作成。保護者メールは consent_items に
  // 保持し、同意依頼メールの送信は K-11〜15 で実装する。
  if (role === "student") {
    const { error: consentError } = await admin.from("consent_records").insert({
      student_id: user.id,
      token: crypto.randomUUID(),
      status: "pending",
      consent_items: { parent_email: parentEmail },
    });
    if (consentError) console.error("同意レコード作成失敗", consentError.message);
  }

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role, school_id: finalSchoolId },
  });

  await supabase.auth.refreshSession();

  if (role === "student") redirect("/onboarding/student-check"); // B-11: 同意待ち
  if (accountStatus === "pending") redirect("/onboarding/review"); // B-15: 審査待ち
  redirect("/");
}
