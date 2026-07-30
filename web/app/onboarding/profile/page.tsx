import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { completeOnboarding } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = searchParams.role ?? "";
  const schoolId = searchParams.schoolId ?? "";

  return (
    <main className="mx-auto max-w-md mt-16 px-4">
      <h1 className="text-xl font-bold">プロフィール入力</h1>

      <form action={completeOnboarding} className="mt-6 space-y-4">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="schoolId" value={schoolId} />

        <label>氏名</label>
        <input name="fullName" required />

        <button type="submit">登録する</button>
      </form>
    </main>
  );
}
