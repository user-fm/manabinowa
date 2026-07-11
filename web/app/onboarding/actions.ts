"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SCHOOL_PATH_ROLES = ["teacher", "student", "admin", "board"];
const PERSONAL_PATH_ROLES = ["volunteer", "community"];
// 学校への所属を持つロール（教委は学校には紐付けない）
const SCHOOL_MEMBER_ROLES = ["teacher", "student", "admin"];

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName) redirect("/onboarding?error=invalid");

  const admin = createAdminClient();

  // メールドメインから所属校を再照合
  const domain = user.email.split("@")[1] ?? "";
  const { data: school } = await admin
    .from("schools")
    .select("id, municipality_code")
    .eq("workspace_domain", domain)
    .maybeSingle();

  const allowedRoles = school ? SCHOOL_PATH_ROLES : PERSONAL_PATH_ROLES;
  if (!allowedRoles.includes(role)) redirect("/onboarding?error=invalid");

  const isSchoolMember = school !== null && SCHOOL_MEMBER_ROLES.includes(role);
  const finalSchoolId = isSchoolMember ? school.id : null;
  const municipalityCode = isSchoolMember ? school.municipality_code : null;

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
