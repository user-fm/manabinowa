"use server";

/**
 * オンボーディング登録処理（B-10〜B-18）
 * - ロール偽装防止
 * - schoolId 偽装防止
 * - 生徒の保護者同意レコード作成（B-11〜B-12）
 * - volunteer/community の審査待ち設定（B-15〜B-16）
 */

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  classifyUserByEmail,
  isRoleAllowedFor,
  allowedRolesFor,
} from "@/lib/auth/classify-user";
import { db } from "@/lib/db";
import { consent_records } from "@/lib/db/schema";

/**
 * B12 — 保護者同意メール送信（まだ TODO）
 * - consent_records に pending を作成
 * - メール送信は後で Resend / SMTP を実装
 */
async function sendParentConsentEmail(studentId: string, parentEmail: string) {
  const token = crypto.randomUUID();

  await db.insert(consent_records).values({
    id: crypto.randomUUID(),
    student_id: studentId,
    token,
    status: "pending",
  });

  // TODO: 保護者宛メール送信処理
}

export async function completeOnboarding(formData: FormData) {
  /** Supabase セッション取得 */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  /** フォーム値取得 */
  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolId = String(formData.get("schoolId") ?? "");
  const parentEmail = String(formData.get("parentEmail") ?? "");

  /** メールドメインから校内/個人を判定（B-7〜B-8） */
  const classification = await classifyUserByEmail(user.email);

  /** ロール偽装防止（URL や hidden input を書き換えても弾く） */
  if (!isRoleAllowedFor(role, classification)) {
    redirect("/onboarding?error=role");
  }

  /** 校内ユーザーの場合は schoolId 偽装防止 */
  if (classification.kind === "school") {
    if (classification.school.id !== schoolId) {
      redirect("/onboarding/profile?error=school");
    }
  }

  /** 氏名・ロールの基本バリデーション */
  if (!fullName || !allowedRolesFor(classification).includes(role as any)) {
    redirect("/onboarding?error=invalid");
  }

  /** 校内ロールは schoolId 必須 */
  const SCHOOL_ROLES = ["teacher", "student", "admin", "board"];
  if (SCHOOL_ROLES.includes(role) && !schoolId) {
    redirect("/onboarding?error=school");
  }

  const admin = createAdminClient();

  /** B08 — 学校情報の取得（自治体コード） */
  let finalSchoolId: string | null = null;
  let municipalityCode: string | null = null;

  if (classification.kind === "school") {
    const { data: school } = await admin
      .from("schools")
      .select("id, municipality_code")
      .eq("id", classification.school.id)
      .maybeSingle();

    if (!school) redirect("/onboarding?error=school");

    finalSchoolId = school.id;
    municipalityCode = school.municipality_code;
  }

  /** volunteer / community は審査待ち */
  const accountStatus =
    role === "volunteer" || role === "community" ? "pending" : "active";

  /**
   * B17 — users テーブル登録
   * FK のため、consent_records より先に users を作成する必要がある
   */
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
    redirect("/onboarding?error=db");
  }

  /**
   * B11〜B12 — 生徒は保護者同意が必須
   * users 作成後に consent_records を作成する（FK のため）
   */
  if (role === "student") {
    if (!parentEmail) {
      redirect("/onboarding/profile?error=parent");
    }

    await sendParentConsentEmail(user.id, parentEmail);
    redirect("/onboarding/student-check");
  }

  /** JWT メタデータ更新（RLS 用） */
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      role,
      school_id: finalSchoolId,
    },
  });

  await supabase.auth.refreshSession();

  /** volunteer / community → 審査待ち画面へ */
  if (accountStatus === "pending") {
    redirect("/onboarding/review");
  }

  /** その他 → ダッシュボードへ */
  redirect("/");
}
