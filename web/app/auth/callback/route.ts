import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyUserByEmail } from "@/lib/auth/classify-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();

  // B-05: Google 認証成功？
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // 
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no-email`);
  }

  // B-07: メールドメイン判定
  const result = await classifyUserByEmail(user.email);

  // B-08〜B-13: 校内 or 個人 分岐
  if (result.kind === "school") {
    return NextResponse.redirect(
      `${origin}/onboarding/school-role?schoolId=${result.school.id}`
    );
  }

  return NextResponse.redirect(`${origin}/onboarding/personal-role`);
}
