import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

export default async function VolunteerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["volunteer"]);
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
