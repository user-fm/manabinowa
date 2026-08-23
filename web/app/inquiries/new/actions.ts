"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["bug", "usage", "unblock", "consent", "deletion", "other"];

export async function createInquiry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const category = String(formData.get("category") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!CATEGORIES.includes(category) || !subject || !body) {
    redirect("/inquiries/new?error=invalid");
  }

  const { error } = await admin.from("inquiries").insert({
    user_id: user.id,
    contact_email: user.email,
    role_snapshot: profile.role,
    category,
    subject,
    body,
    status: "open",
  });
  if (error) {
    console.error("問い合わせ送信失敗", error.message);
    redirect("/inquiries/new?error=db");
  }

  redirect("/inquiries/new?sent=1");
}
