"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { NOTIFICATION_CATEGORIES } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Jフロー: 通知の受け取り設定を保存する。
 * チェックが外れている種類だけを notification_categories に false で残し、
 * 既定(行が無い)は「受け取る」として扱う。
 */
export async function saveNotificationPrefs(formData: FormData) {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const emailEnabled = formData.get("emailEnabled") === "on";
  const { error: prefError } = await admin.from("notification_prefs").upsert(
    {
      user_id: profile.id,
      email_enabled: emailEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (prefError) {
    console.error("通知設定の保存失敗", prefError.message);
    redirect("/settings?error=db");
  }

  const rows = NOTIFICATION_CATEGORIES.map((category) => ({
    user_id: profile.id,
    category,
    enabled: formData.get(`category_${category}`) === "on",
  }));
  const { error: categoryError } = await admin
    .from("notification_categories")
    .upsert(rows, { onConflict: "user_id,category" });
  if (categoryError) {
    console.error("通知種別の保存失敗", categoryError.message);
    redirect("/settings?error=db");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=notification");
}
