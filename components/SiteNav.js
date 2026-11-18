"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "라이브러리"],
  ["/ask", "질의"],
  ["/compare", "비교"],
  ["/guide", "구축 가이드"],
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <aside className="nav">
      <Link href="/" className="brand">
        <small>AI & Tech</small>
        <strong>케이스 뱅크</strong>
      </Link>
      <nav>
        {LINKS.map(([href, label]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="item" data-active={active ? "true" : "false"}>
              {label}
            </Link>
          );
        })}
      </nav>
      <footer>공개 자료와 계획 시나리오. 고객 실적은 없습니다.</footer>
    </aside>
  );
}
