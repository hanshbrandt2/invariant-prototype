import { getFig1Lineage } from "@/lib/data";
import { ResearchGraph } from "@/components/landing/research-graph";

/** Reads the lineage through lib/data (fixture now, live export later). */
export async function Fig1() {
  const subgraph = await getFig1Lineage();
  return <ResearchGraph subgraph={subgraph} />;
}
