"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function splitList(value: string): string[] {
  return value
    .split(/[,、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveVolunteerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "volunteer") redirect("/");

  const subjects = splitList(String(formData.get("subjects") ?? ""));
  const grades = splitList(String(formData.get("grades") ?? ""));
  const availability = String(formData.get("availability") ?? "").trim() || null;
  const intro = String(formData.get("intro") ?? "").trim() || null;
  if (subjects.length === 0 || grades.length === 0) {
    redirect("/volunteer/profile?error=invalid");
  }

  // 既存のプロフィール(最新1件)を更新、無ければ新規作成。
  // search_text / embedding は検索機能の実装時に生成する。
  const { data: existing } = await admin
    .from("volunteer_offers")
    .select("id")
    .eq("volunteer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const values = { subjects, grades, availability, intro, is_active: true };
  const { error } = existing
    ? await admin.from("volunteer_offers").update(values).eq("id", existing.id)
    : await admin.from("volunteer_offers").insert({ volunteer_id: user.id, ...values });

  if (error) {
    console.error("スキル登録失敗", error.message);
    redirect("/volunteer/profile?error=db");
  }
  redirect("/volunteer/profile?saved=1");
}
