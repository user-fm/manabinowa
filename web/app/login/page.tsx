"use client";

import Image from "next/image";
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
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-10 text-center shadow-sm">
        <Image src="/img/logo_192.png" alt="" width={64} height={64} className="mx-auto" priority />
        <h1 className="mt-5 text-2xl font-bold tracking-wide text-brand-dark">まなびのわ</h1>
        <p className="mt-2 text-xs tracking-widest text-brand">途切れない、学びのサイクル</p>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-10 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          Google でログイン
        </button>

        <p className="mt-6 text-xs leading-6 text-muted">
          学校から配布されたアカウント、
          <br />
          または個人の Google アカウントでログインできます。
        </p>
      </div>
    </main>
  );
}
