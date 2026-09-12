import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Role = "teacher" | "student" | "volunteer" | "community" | "admin" | "board";

export type Profile = {
  id: string;
  role: Role;
  fullName: string;
  accountStatus: string;
  schoolId: string | null;
  /** 教育委員会の所管自治体。学校所属ロールは school 経由で導出するため null */
  municipalityCode: string | null;
};

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSessionProfile(): Promise<{
  userId: string;
  email: string;
  profile: Profile | null;
} | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, role, full_name, account_status, school_id, municipality_code")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("セッションプロファイル取得失敗", error.message);
    // throw error;
    return null;
  }

  const profile: Profile | null = data
    ? {
        id: data.id,
        role: data.role,
        fullName: data.full_name,
        accountStatus: data.account_status,
        schoolId: data.school_id,
        municipalityCode: data.municipality_code,
      }
    : null;
  return { userId: user.id, email: user.email ?? "", profile };
}

export async function requireProfile(): Promise<Profile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  return session.profile;
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/");

  if (profile.role === "student" && profile.accountStatus !== "active") {
    redirect("/onboarding/student-check");
  }
  return profile;
}
