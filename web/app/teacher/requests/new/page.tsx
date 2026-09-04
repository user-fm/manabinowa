import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Card className="border-red-300 bg-red-50 text-sm font-bold text-red-700">
          学校が未設定です。登録をやり直してください。
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title="ボランティア依頼を作る"
        lead="教科・学年・お困りの内容を書いてください。内容をもとに、力になれるボランティアを探します。"
        back={{ href: "/teacher/requests", label: "依頼の状況へ戻る" }}
      />

      {error ? (
        <p className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "保存に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <Card className="p-6 sm:p-8">
        <form action={createRequest} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="教科" htmlFor="subject">
              <Input id="subject" name="subject" required placeholder="例: 数学" />
            </Field>
            <Field label="学年" htmlFor="grade">
              <Input id="grade" name="grade" required placeholder="例: 中学2年" />
            </Field>
          </div>

          <Field label="希望日時" htmlFor="desiredAt" hint="任意">
            <Input id="desiredAt" name="desiredAt" type="datetime-local" />
          </Field>

          <Field label="依頼内容" htmlFor="detail" hint="つまずいている単元や、お子さんの様子など">
            <Textarea
              id="detail"
              name="detail"
              required
              rows={6}
              placeholder="例: 方程式の文章題でつまずいています。式の立て方から一緒に確認してもらえると助かります。"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Button type="submit">この内容で依頼する</Button>
            <span className="text-xs font-medium text-muted">
              送信後、候補のボランティアが表示されます
            </span>
          </div>
        </form>
      </Card>
    </main>
  );
}
