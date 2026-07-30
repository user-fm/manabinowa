"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { consent_records } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";

const VALID_ROLES = ["teacher", "student", "volunteer", "community", "admin", "board"] as const;
const SCHOOL_ROLES = ["teacher", "student", "admin"];

/* -------------------------------------------------------
   B12 — 保護者同意メールの送信
   生徒アカウントの場合、保護者に同意依頼メールを送信する処理。
   Resend または Supabase SMTP を使用してメール送信を実装する予定。
------------------------------------------------------- */
async function sendParentConsentEmail(studentId: string, parentEmail: string) {
  const token = uuidv4();

  await db.insert(consent_records).values({
    id: uuidv4(),
    student_id: studentId,
    token,
    status: "pending",
  });

  // TODO: 保護者宛メール送信処理を実装する
}

/* -------------------------------------------------------
   B10 / B14 — プロフィール情報の受け取り
   ユーザーが入力した役割・氏名・学校IDを取得し、バリデーションを行う。
------------------------------------------------------- */
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

  /* -------------------------------------------------------
     B08 — 学校情報の取得
     学校ロール（教師・生徒・管理者）の場合、選択された学校IDから自治体コードを取得する。
  ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     B11 — 生徒ロールの場合の処理
     生徒は保護者同意が必須のため、同意レコードを作成し、確認ページへリダイレクトする。
  ------------------------------------------------------- */
  if (role === "student") {
    await sendParentConsentEmail(user.id, user.email);
    redirect("/onboarding/student-check");
  }

  /* -------------------------------------------------------
     B15–B16 — ボランティア・地域ユーザーの審査待ち
     これらのロールは運営による審査が必要なため、account_status を pending に設定する。
  ------------------------------------------------------- */
  const accountStatus =
    role === "volunteer" || role === "community" ? "pending" : "active";

  /* -------------------------------------------------------
     B17 — users テーブルへの登録
     Supabase の service role を用いてユーザー情報を DB に登録する。
  ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     JWT メタデータの更新
     ロールと学校IDを app_metadata に保存し、RLS（行レベルセキュリティ）で利用できるようにする。
  ------------------------------------------------------- */
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role, school_id: finalSchoolId },
  });

  await supabase.auth.refreshSession();

  /* -------------------------------------------------------
     B18 — 審査待ちユーザーは審査ページへ、その他はダッシュボードへ遷移
     volunteer / community → /onboarding/review
     teacher / admin / board → /
  ------------------------------------------------------- */
  if (accountStatus === "pending") {
    redirect("/onboarding/review");
  }

  redirect("/");
}
