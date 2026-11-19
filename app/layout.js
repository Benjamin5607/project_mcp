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
  title: "AI and tech solution case bank",
  description: "Search Cisco public AI and security architectures and draft PM artifacts from a local RAG case bank.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <div className="shell">
          <SiteNav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
