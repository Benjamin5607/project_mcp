import { notFound } from "next/navigation";
import { CaseView } from "../../../components/CaseView";
import { loadCases } from "../../../lib/store.mjs";

export function generateStaticParams() {
  return loadCases().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = loadCases().find((entry) => entry.slug === slug);
  return { title: item ? `${item.caseCode} ${item.title}` : "사례" };
}

export default async function CasePage({ params }) {
  const { slug } = await params;
  const item = loadCases().find((entry) => entry.slug === slug);
  if (!item) notFound();
  return <CaseView item={item} />;
}
