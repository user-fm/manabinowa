"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["poster", "event", "lecturer", "other"];

export async function createCommunityRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "community") redirect("/");

  // 審査待ちの間は送信不可(開発中は許可)
  const canSubmit = profile.account_status === "active" || process.env.NODE_ENV !== "production";
  if (!canSubmit) redirect("/");

  const schoolId = String(formData.get("schoolId") ?? "");
  const category = String(formData.get("category") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  if (!schoolId || !CATEGORIES.includes(category) || !title || !detail) {
    redirect("/community/requests/new?error=invalid");
  }

  const { error } = await admin.from("community_requests").insert({
    community_id: user.id,
    target_school_id: schoolId,
    category,
    title,
    detail,
    due_date: dueDate || null,
    status: "pending",
  });
  if (error) {
    console.error("地域依頼の作成失敗", error.message);
    redirect("/community/requests/new?error=db");
  }

  redirect("/community/requests");
}
