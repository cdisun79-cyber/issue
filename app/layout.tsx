import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "기사 전달", description: "언론기사 담당부서 전달" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <nav>
          <Link href="/">기사 전달</Link>
          <Link href="/staff">담당현황</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
