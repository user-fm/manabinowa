/**
 * B-05〜B-13 OAuth コールバック処理
 *
 * 役割:
 * - Google/Microsoft OAuth の認証コードを Supabase に渡してセッション確立（B-05）
 * - ログインしたユーザーのメールアドレスを取得（B-06）
 * - メールドメインから校内/個人を判定（B-07〜B-08）
 * - 校内ユーザー → school-role 画面へ遷移（B-09）
 * - 個人ユーザー → personal-role 画面へ遷移（B-13）
 *
 * 注意:
 * - この段階では users テーブルにはまだ登録されていない
 * - ロール選択は onboarding 側で行う
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyUserByEmail } from "@/lib/auth/classify-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  /** B-05: OAuth 認証コードが存在するか？ */
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();

  /** B-05: 認証コードを Supabase に渡してセッション確立 */
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  /** B-06: ログインユーザー情報を取得 */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no-email`);
  }

  /** B-07〜B-08: メールドメインから校内/個人を判定 */
  const classification = await classifyUserByEmail(user.email);

  /** B-09〜B-13: 校内 or 個人 分岐 */
  if (classification.kind === "school") {
    // 校内ユーザー → 校内ロール選択画面へ
    return NextResponse.redirect(
      `${origin}/onboarding/school-role?schoolId=${classification.school.id}`
    );
  }

  // 個人ユーザー → 個人ロール選択画面へ
  return NextResponse.redirect(`${origin}/onboarding/personal-role`);
}
