/**
 * B-9〜B-14 オンボーディング画面
 * - メールドメインから校内/個人を自動判定（URL 改ざん防止）
 * - allowedRolesFor(classification) に基づき選択可能ロールを表示
 * - 校内ユーザーは schoolId を hidden input で安全に付与
 * - 生徒の場合は保護者メール入力欄を表示（B-12）
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  classifyUserByEmail,
  allowedRolesFor,
  type AppRole,
} from "@/lib/auth/classify-user";
import { completeOnboarding } from "./actions"; // ← 修正ポイント

/** ロール表示ラベル */
const ROLE_LABELS: Record<AppRole, string> = {
  teacher: "教師",
  student: "生徒",
  volunteer: "ボランティア",
  community: "地域住民・団体",
  admin: "学校管理者",
  board: "教育委員会",
};

export default async function OnboardingPage() {
  /** Supabase セッション取得 */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  /** B-7〜B-8 メールドメインから校内/個人を判定 */
  const classification = await classifyUserByEmail(user.email);

  /** 選択可能ロールを取得（偽装防止） */
  const availableRoles = allowedRolesFor(classification);

  /** 氏名の初期値（Google/Microsoft の user_metadata） */
  const meta = user.user_metadata ?? {};
  const defaultName =
    (meta.full_name as string) ??
    (meta.name as string) ??
    "";

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">登録を完了してください</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>

      <p className="mt-1 text-xs text-gray-500">
        {classification.kind === "school"
          ? `${classification.school.workspaceDomain} の校内アカウントとして登録します`
          : "個人アカウントとして登録します（ボランティア／地域）"}
      </p>

      <form action={completeOnboarding} className="mt-6 space-y-4">
        {/* 校内ユーザーは schoolId を安全に付与（URL 改ざん防止） */}
        {classification.kind === "school" && (
          <input
            type="hidden"
            name="schoolId"
            value={classification.school.id}
          />
        )}

        {/* ロール選択（allowedRolesFor に基づく安全な選択肢） */}
        <label className="block text-sm font-medium">役割</label>
        <select
          name="role"
          required
          className="border rounded px-2 py-1 w-full"
          defaultValue=""
        >
          <option value="">選択してください</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        {/* 氏名入力 */}
        <label className="block text-sm font-medium mt-4">氏名</label>
        <input
          name="fullName"
          required
          defaultValue={defaultName}
          className="border rounded px-2 py-1 w-full"
        />

        {/* 生徒のみ保護者メールを必須にする（B-12） */}
        {availableRoles.includes("student") && (
          <>
            <label className="block text-sm font-medium mt-4">
              保護者メールアドレス
            </label>
            <input
              name="parentEmail"
              type="email"
              required
              placeholder="parent@example.com"
              className="border rounded px-2 py-1 w-full"
            />
          </>
        )}

        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
        >
          登録する
        </button>
      </form>
    </main>
  );
}
