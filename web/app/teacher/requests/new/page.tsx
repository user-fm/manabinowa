import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { createRequest } from "./actions";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole(["teacher"]);
  const { error } = await searchParams;

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/teacher/requests" className="text-sm text-gray-500 hover:text-gray-900">
        ← 依頼の状況へ戻る
      </Link>
      <h1 className="mt-3 text-xl font-bold">ボランティア依頼を作る</h1>

      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "保存に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <form
        action={createRequest}
        className="mt-6 space-y-4 p-6 rounded-lg border border-gray-300 bg-white"
      >
        <Field label="教科" htmlFor="subject">
          <Input id="subject" name="subject" required placeholder="例: 数学" />
        </Field>
        <Field label="学年" htmlFor="grade">
          <Input id="grade" name="grade" required placeholder="例: 中学2年" />
        </Field>
        <Field label="希望日時" htmlFor="desiredAt" hint="(任意)">
          <Input id="desiredAt" name="desiredAt" type="datetime-local" />
        </Field>
        <Field label="依頼内容" htmlFor="detail">
          <Textarea id="detail" name="detail" required rows={4} />
        </Field>
        <Button type="submit">作成する</Button>
      </form>
    </main>
  );
}
