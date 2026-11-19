"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Library"],
  ["/ask", "Ask"],
  ["/onepager", "One-pager"],
  ["/compare", "Compare"],
  ["/guide", "Build guide"],
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <aside className="nav">
      <Link href="/" className="brand">
        <small>AI & Tech</small>
        <strong>Case bank</strong>
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
      <footer>Public material and planning scenarios. No customer results.</footer>
    </aside>
  );
}
