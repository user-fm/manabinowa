import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AppHeader({ userName }: { userName: string }) {
    return (
        <header className="border-b">
            <div className="mx-auto flex max-w-3x1 items-center justify-between px-4 py-3">
                <Link href="/" className="text-lg font-bold">
                    まなびのわ
                </Link>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600">{userName}</span>
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