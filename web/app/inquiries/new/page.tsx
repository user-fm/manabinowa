import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireProfile } from "@/lib/auth";
import { INQUIRY_CATEGORY_LABEL } from "@/lib/labels";
import { createInquiry } from "./actions";

export default async function NewInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; category?: string }>;
}) {
  await requireProfile();
  const { sent, error, category } = await searchParams;
  // 設定画面などから種類を指定して開ける(例: データ削除の申し出)
  const defaultCategory = category && category in INQUIRY_CATEGORY_LABEL ? category : "";

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <PageHeader title="お問い合わせ" />
        <Card className="py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="check" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">受け付けました</p>
          <p className="mt-2 text-xs font-medium text-muted">
            運営からの回答をお待ちください。登録のメールアドレスにご連絡します。
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader
        title="お問い合わせ"
        lead="運営への連絡フォームです。不具合の報告や、使い方のご相談にお使いください。"
      />

      {error ? (
        <p className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "送信に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <Card className="p-6 sm:p-8">
        <form action={createInquiry} className="space-y-6">
          <Field label="種類" htmlFor="category">
            <Select id="category" name="category" required defaultValue={defaultCategory}>
              <option value="">選択してください</option>
              {Object.entries(INQUIRY_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="件名" htmlFor="subject">
            <Input id="subject" name="subject" required placeholder="例: ログインできません" />
          </Field>
          <Field label="内容" htmlFor="body">
            <Textarea
              id="body"
              name="body"
              required
              rows={6}
              placeholder="お困りの状況を具体的に書いていただけると、対応が早くなります。"
            />
          </Field>
          <div className="border-t border-line pt-6">
            <Button type="submit">送信する</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
