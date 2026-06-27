import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createRequest } from "./actions";

export default async function NewRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");
  if (profile.role !== "teacher") redirect("/"); // 教師以外は弾く

  if (!profile.school_id) {
    return (
      <main className="mx-auto mt-16 max-w-md px-4">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-12 max-w-md px-4">
      <h1 className="text-xl font-bold">ボランティア依頼を作成</h1>
      <form action={createRequest} className="mt-6 space-y-4">
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
          <textarea
            id="detail"
            name="detail"
            required
            rows={4}
            className="mt-1 w-full rounded border p-2"
          />
        </Field>
        <Button type="submit">作成する</Button>
      </form>
    </main>
  );
}