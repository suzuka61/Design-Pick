import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignPick",
  description: "从任意网页或截图中提取设计系统，生成结构化 DESIGN.md 文件",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
