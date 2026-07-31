import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireProfile } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
