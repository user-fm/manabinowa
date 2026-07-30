// web/lib/auth/classify-user.ts

import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function extractEmailDomain(email: string): string | null {
  if (!email) return null;

  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split("@");

  if (parts.length < 2) return null;

  const domain = parts[parts.length - 1];
  if (!domain) return null;

  return domain;
}

export type UserClassification =
  | {
      kind: "school";
      domain: string;
      school: { id: string; name: string; workspaceDomain: string };
    }
  | { kind: "personal"; domain: string };

export async function classifyUserByEmail(
  email: string
): Promise<UserClassification> {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return { kind: "personal", domain: "" };
  }

  const result = await db
    .select({
      id: schools.id,
      name: schools.name,
      workspaceDomain: schools.workspace_domain,
    })
    .from(schools)
    .where(eq(schools.workspace_domain, domain))
    .limit(1);

  const school = result[0];

  if (school) {
    return {
      kind: "school",
      domain,
      school,
    };
  }

  return {
    kind: "personal",
    domain,
  };
}
