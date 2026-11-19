import { OnePagerStudio } from "../../components/OnePagerStudio";
import { listOnePagers } from "../../lib/onepager/store.mjs";

export const metadata = { title: "One-pager · Case bank" };

export default function OnePagerPage() {
  return <OnePagerStudio initial={null} recent={listOnePagers()} />;
}
