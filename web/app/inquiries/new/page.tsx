import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { INQUIRY_CATEGORY_LABEL } from "@/lib/labels";
import { createInquiry } from "./actions";

export default async function NewInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  await requireProfile();
  const { sent, error } = await searchParams;

  if (sent) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-bold">お問い合わせ</h1>
        <p className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          受け付けました。運営からの回答をお待ちください。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">お問い合わせ</h1>
      <p className="mt-1 text-sm text-gray-500">運営への連絡フォームです。</p>

      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "送信に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <form action={createInquiry} className="mt-6 space-y-4">
        <Field label="種類" htmlFor="category">
          <Select id="category" name="category" required defaultValue="">
            <option value="">選択してください</option>
            {Object.entries(INQUIRY_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="件名" htmlFor="subject">
          <Input id="subject" name="subject" required />
        </Field>
        <Field label="内容" htmlFor="body">
          <Textarea id="body" name="body" required rows={5} />
        </Field>
        <Button type="submit">送信する</Button>
      </form>
    </main>
  );
}
