"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

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
      <Image
        src="/img/logo_192.png"
        alt="まなびのわ"
        width={192}
        height={192}
        className="mx-auto"
      />
      <h1 className="mt-4 text-3xl font-bold text-[#155c38]">まなびのわ</h1>
      <p className="mt-2 text-sm text-gray-600">ログインしてください</p>
      <button type="button" onClick={signInWithGoogle} className="mt-6 rounded-full border border-gray-300 bg-white px-6 py-3 transition-all hover:border-[#155c38] hover:shadow-md">
        Google でログイン
      </button>
    </main>
  );
}
