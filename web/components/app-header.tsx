// import Link from "next/link";
// import { Button } from "@/components/ui/button";

// export function AppHeader({ userName }: { userName: string }) {
//     return (
//         <header className="border-b">
//             <div className="mx-auto flex max-w-3x1 items-center justify-between px-4 py-3">
//                 <Link href="/" className="text-lg font-bold">
//                     まなびのわ
//                 </Link>
//                 <div className="flex items-center gap-3 text-sm">
//                     <span className="text-gray-600">{userName}</span>
//                     <form action="/auth/signout" method="post">
//                     <Button type="submit" variant="outline">
//                         ログアウト
//                     </Button>
//                     </form>
//                 </div>
//             </div>
//         </header>
//     );
// }
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// import styles from "./app-header.module.css";

export function AppHeader({
    userName,
    role, 
}: {
    userName: string; 
    role: string; 
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-white">
      <div className="flex w-full items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image
            src="/logo.png"
            alt="まなびのわ"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-xl font-bold text-[#155c38]">まなびのわ</span>
          <span className="flex h-8 items-center justify-center rounded-lg bg-[#e8f3ec] px-3.5 text-sm font-semibold text-[#155c38]">
            {role}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{userName} さん</span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}