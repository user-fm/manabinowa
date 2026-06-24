"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["teacher", "student", "volunteer", "community", "admin", "board"] as const;

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName || !(VALID_ROLES as readonly string[]).includes(role)) {
    redirect("/onboarding?error=invalid");
  }

  // 個人Gmail(ボランティア/地域)は運営審査前提 → pending、学校系 → active
  const accountStatus = role === "volunteer" || role === "community" ? "pending" : "active";

  const admin = createAdminClient();

  // 1) public.users を作成(RLSバイパス)
  const { error: insertError } = await admin.from("users").insert({
    id: user.id,
    role,
    account_status: accountStatus,
    full_name: fullName,
    email: user.email,
  });
  if (insertError) redirect("/onboarding?error=db");

  // 2) ロールを JWT クレーム(app_metadata)へ → RLS の app_current_role() が効くようになる
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role, school_id: null },
  });

  // 3) 現在セッションの JWT を更新して新クレームを反映(これが無いと role が乗らない)
  await supabase.auth.refreshSession();

  redirect("/");
}
