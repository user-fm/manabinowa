"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="mx-auto mt-20 max-w-sm text-center">
      <h1 className="text-xl font-bold">まなびのわ</h1>
      <p className="mt-2 text-sm text-gray-600">ログインしてください</p>
      <button type="button" onClick={signInWithGoogle} className="mt-6 rounded border px-4 py-2">
        Google でログイン
      </button>
    </main>
  );
}
