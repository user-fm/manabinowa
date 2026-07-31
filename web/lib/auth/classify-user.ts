// OAuth ログイン後のユーザー区分判定ロジック。
// ログインしたメールアドレスのドメインを見て、学校の Workspace ドメイン
// (schools.workspace_domain) に一致すれば「校内ユーザー」、それ以外
// (個人 Gmail など) は「個人ユーザー」として分類する。
//
// この分類はオンボーディングで選べるロールを振り分けるための基盤となる。
//   校内ユーザー → teacher / student / admin / board（学校・機関系ロール）
//   個人ユーザー → volunteer / community（運営審査あり）
//
// ※ ルーティング（どの画面を表示するか）は app/page.tsx 側が role を見て判断する。
//   本ファイルは「ロールの選択可能範囲を決める」責務のみ。

import { createAdminClient } from "@/lib/supabase/admin";

/** public.users.role に対応するロール一覧 */
export type AppRole =
  | "teacher"
  | "student"
  | "volunteer"
  | "community"
  | "admin"
  | "board";

/** 校内ユーザーが選べるロール */
export const SCHOOL_ROLES = [
  "teacher",
  "student",
  "admin",
  "board",
] as const satisfies readonly AppRole[];

/** 個人ユーザーが選べるロール（審査前提） */
export const PERSONAL_ROLES = [
  "volunteer",
  "community",
] as const satisfies readonly AppRole[];

/** 判定結果の型 */
export type UserClassification =
  | {
      kind: "school";
      domain: string;
      school: {
        id: string;
        name: string;
        workspaceDomain: string;
      };
    }
  | {
      kind: "personal";
      domain: string;
    };

/**
 * メールアドレスからドメイン部分を抽出する純粋関数。
 * - 前後の空白を除去し、小文字化
 * - "@" が無い / ローカル部が空 / ドメイン部が空 → null
 * - "@" が複数ある場合は最後の "@" 以降をドメインとして扱う
 */
export function extractEmailDomain(
  email: string | null | undefined,
): string | null {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0) return null; // ローカル部が空 or "@" が無い

  const domain = normalized.slice(atIndex + 1);
  return domain.length > 0 ? domain : null;
}

/**
 * メールドメインを schools.workspace_domain と突き合わせて、
 * 校内ユーザーか個人ユーザーかを判定する。
 *
 * - workspace_domain は DB 側で大文字混じりの可能性があるため、
 *   ilike + JS 側での小文字比較の二重チェックを行う。
 * - ilike は複数行返す可能性があるため maybeSingle は使わず find で拾う。
 * - ドメインが取れない場合は安全側として「個人ユーザー」扱いにする。
 */
export async function classifyUserByEmail(
  email: string | null | undefined,
): Promise<UserClassification> {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return { kind: "personal", domain: "" };
  }

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("schools")
    .select("id, name, workspace_domain")
    .ilike("workspace_domain", domain);

  const matched = (rows ?? []).find(
    (s) => s.workspace_domain?.toLowerCase() === domain,
  );

  if (matched?.workspace_domain) {
    return {
      kind: "school",
      domain,
      school: {
        id: matched.id,
        name: matched.name,
        workspaceDomain: matched.workspace_domain,
      },
    };
  }

  return { kind: "personal", domain };
}

/**
 * 校内/個人の分類結果から、選択可能なロール一覧を返す。
 */
export function allowedRolesFor(
  classification: UserClassification,
): readonly AppRole[] {
  return classification.kind === "school"
    ? SCHOOL_ROLES
    : PERSONAL_ROLES;
}

/**
 * 指定ロールが分類結果に対して選択可能かどうかを判定する。
 * （サーバー側のロール偽装防止チェック用）
 */
export function isRoleAllowedFor(
  role: string,
  classification: UserClassification,
): role is AppRole {
  return (allowedRolesFor(classification) as readonly string[]).includes(role);
}
