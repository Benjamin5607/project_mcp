import { Fraunces, IBM_Plex_Sans_KR } from "next/font/google";
import { SiteNav } from "../components/SiteNav";
import "./globals.css";

const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata = {
  title: "AI & Tech 솔루션 케이스 뱅크",
  description: "시스코 공개 AI·보안 아키텍처를 PM 프레임워크로 검색하고 초안을 만드는 RAG 케이스 뱅크",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${serif.variable}`}>
        <div className="shell">
          <SiteNav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
