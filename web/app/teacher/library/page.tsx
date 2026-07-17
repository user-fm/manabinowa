import { requireRole } from "@/lib/auth";
import { COMMUNITY_CATEGORY_LABEL, fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherLibraryPage() {
  const profile = await requireRole(["teacher"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("community_library")
    .select("id, title, category, provider, drive_url, created_at")
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">教材ライブラリ</h1>
      <p className="mt-1 text-sm text-gray-500">
        受け入れた地域からの依頼を教材として保存する場所です。検索・登録は準備中です。
      </p>

      {!items || items.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">教材はまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-gray-500">
                  {COMMUNITY_CATEGORY_LABEL[item.category] ?? item.category}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                提供: {item.provider ?? "—"} ／ 登録: {fmtDateTime(item.created_at)}
              </p>
              {item.drive_url ? (
                <a
                  href={item.drive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-blue-700 underline"
                >
                  資料を開く
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
