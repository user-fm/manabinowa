import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { requireProfile } from "@/lib/auth";

export default async function SessionsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
