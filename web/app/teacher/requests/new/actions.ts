"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "teacher" || !profile.school_id) redirect("/");

  const subject = String(formData.get("subject") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const desiredAtRaw = String(formData.get("desiredAt") ?? "").trim();
  if (!subject || !grade || !detail) redirect("/teacher/requests/new?error=invalid");

  // ユーザー文脈で挿入(RLSを効かせる)。teacher_id/school_id は本人の値。
  const { error } = await supabase.from("volunteer_requests").insert({
    teacher_id: user.id,
    school_id: profile.school_id,
    subject,
    grade,
    detail,
    desired_at: desiredAtRaw ? new Date(desiredAtRaw).toISOString() : null,
    status: "open",
  });
  if (error) {
    console.error("依頼作成失敗", error.message);
    redirect("/teacher/requests/new?error=db");
  }

  redirect("/");
}