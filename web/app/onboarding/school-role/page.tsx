"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SchoolRolePage() {
  const router = useRouter();
  const params = useSearchParams();
  const schoolId = params.get("schoolId");

  const selectRole = (role: string) => {
    router.push(`/onboarding/profile?role=${role}&schoolId=${schoolId}`);
  };

  return (
    <main className="mx-auto max-w-md mt-16 px-4">
      <h1 className="text-xl font-bold">学校内の役割を選択</h1>

      <button onClick={() => selectRole("teacher")}>教師</button>
      <button onClick={() => selectRole("student")}>生徒</button>
      <button onClick={() => selectRole("admin")}>学校管理者</button>
    </main>
  );
}
