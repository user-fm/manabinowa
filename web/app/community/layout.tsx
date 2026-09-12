import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { requireRole } from "@/lib/auth";

export default async function CommunityLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["community"]);
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
