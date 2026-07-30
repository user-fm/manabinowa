"use client";
import { useRouter } from "next/navigation";

export default function PersonalRolePage() {
  const router = useRouter();

  const selectRole = (role: string) => {
    router.push(`/onboarding/profile?role=${role}`);
  };

  return (
    <main className="mx-auto max-w-md mt-16 px-4">
      <h1 className="text-xl font-bold">役割を選択してください</h1>

      <button onClick={() => selectRole("volunteer")}>ボランティア</button>
      <button onClick={() => selectRole("community")}>地域住民・団体</button>
      <button onClick={() => selectRole("board")}>教育委員会</button>
    </main>
  );
}
