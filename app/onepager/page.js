import { OnePagerStudio } from "../../components/OnePagerStudio";
import { listOnePagers } from "../../lib/onepager/store.mjs";

export const metadata = { title: "원페이저 · 케이스 뱅크" };

export default function OnePagerPage() {
  return <OnePagerStudio initial={null} recent={listOnePagers()} />;
}
