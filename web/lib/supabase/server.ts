import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components / Server Actions / Route Handlers 用。
// ユーザーの JWT で接続するため RLS(auth.uid() / app_metadata)が効く(設計書 §1.3)。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component から呼ばれた場合は middleware 側で更新する
          }
        },
      },
    },
  );
}
