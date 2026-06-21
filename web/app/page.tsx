import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Image src="/logo.png" alt="まなびのわ" width={96} height={96} priority />
      <h1 className="text-2xl font-bold text-emerald-800">まなびのわ</h1>
      <p className="text-sm text-zinc-500">途切れない、学びのサイクル</p>
      <p className="mt-4 text-xs text-zinc-400">開発環境セットアップ済み</p>
    </main>
  );
}
