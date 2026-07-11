import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // POST→GET にするため 303
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
