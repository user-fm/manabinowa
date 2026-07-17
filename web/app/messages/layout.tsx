import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

// ロール間メッセージは大人のみ(F-MSG。生徒は対象外)
export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["teacher", "volunteer", "community", "admin", "board"]);
  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      {children}
    </>
  );
}
