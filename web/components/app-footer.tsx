import Link from "next/link";
// import styles from "./app-footer.module.css";

export function AppFooter() {
  return (
    <footer className="fixed bottom-0 left-0 w-full px-5 pt-8 pb-2.5 text-center text-xs text-gray-500">
      <div className="mb-0.5 flex flex-wrap justify-center gap-5">
        <Link href="#" className="text-gray-600 hover:underline">利用規約</Link>
        <Link href="#" className="text-gray-600 hover:underline">プライバシーポリシー</Link>
        <Link href="#" className="text-gray-600 hover:underline">ヘルプ</Link>
        <Link href="#" className="text-gray-600 hover:underline">お問い合わせ</Link>
      </div>
      <small className="text-gray-400">© 2026 まなびのわ</small>
    </footer>
  );
}