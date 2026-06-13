import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ホームディレクトリの無関係な pnpm-lock.yaml をワークスペースルートと
  // 誤検出する警告を防ぐため、このプロジェクトをルートに固定する。
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
