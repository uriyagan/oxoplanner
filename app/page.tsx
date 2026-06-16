import Planner from "@/components/planner/Planner";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

export default async function Home() {
  const catalog = await getCatalog();
  return <Planner catalog={catalog} />;
}
