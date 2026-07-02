"use server";

import { redirect } from "next/navigation";
import { classifyUserByEmail, isRoleAllowedFor } from "@/lib/auth/classify-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["teacher", "student", "volunteer", "community", "admin", "board"] as const;
// 学校の選択(school_id)が必須なロール。board(教育委員会)は特定校に属さないため対象外。
const SCHOOL_REQUIRED_ROLES = ["teacher", "student", "admin"];

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolId = String(formData.get("schoolId") ?? "");

  if (!fullName || !(VALID_ROLES as readonly string[]).includes(role)) {
    redirect("/onboarding?error=invalid");
  }

  // メールドメインの校内/個人判定と選択ロールが一致するかをサーバー側で再検証。
  // (クライアントの絞り込みは改ざん可能なため、書き込み前にここで必ず弾く)
  const classification = await classifyUserByEmail(user.email);
  if (!isRoleAllowedFor(role, classification)) {
    redirect("/onboarding?error=role");
  }

  if (SCHOOL_REQUIRED_ROLES.includes(role) && !schoolId) {
    redirect("/onboarding?error=school");
  }

  const admin = createAdminClient();

  let finalSchoolId: string | null = null;
  let municipalityCode: string | null = null;
  if (schoolId && SCHOOL_REQUIRED_ROLES.includes(role)) {
    const { data: school } = await admin
      .from("schools")
      .select("id, municipality_code")
      .eq("id", schoolId)
      .maybeSingle();
    if (!school) redirect("/onboarding?error=school");
    finalSchoolId = school.id;
    municipalityCode = school.municipality_code;
  }

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
  if (insertError) redirect("/onboarding?error=db");

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role, school_id: finalSchoolId },
  });

  await supabase.auth.refreshSession();

  redirect("/");
}
