import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { requireRole } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["teacher"]);
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
