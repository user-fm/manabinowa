"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["teacher", "student", "volunteer", "community", "admin", "board"] as const;
const SCHOOL_ROLES = ["teacher", "student", "admin"];

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

  if (SCHOOL_ROLES.includes(role) && !schoolId) {
    redirect("/onboarding?error=school");
  }

  const admin = createAdminClient();

  let finalSchoolId: string | null = null;
  let municipalityCode: string | null = null;
  if (schoolId && SCHOOL_ROLES.includes(role)) {
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
