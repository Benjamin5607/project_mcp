import { notFound } from "next/navigation";
import { OnePagerStudio } from "../../../components/OnePagerStudio";
import { listOnePagers, readOnePager } from "../../../lib/onepager/store.mjs";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const doc = readOnePager(id);
  return { title: doc ? `${doc.headline} · One-pager` : "One-pager" };
}

export default async function OnePagerDetailPage({ params }) {
  const { id } = await params;
  let doc = null;
  try {
    doc = readOnePager(id);
  } catch {
    notFound();
  }
  if (!doc) notFound();
  return <OnePagerStudio initial={doc} recent={listOnePagers()} />;
}
