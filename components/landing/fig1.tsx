import { getFig1 } from "@/lib/data";
import { ResearchGraph } from "@/components/landing/research-graph";

/** Reads the lineage + presentation through lib/data (fixture now, live later). */
export async function Fig1() {
  const { subgraph, labels, producerOps } = await getFig1();
  return (
    <ResearchGraph
      subgraph={subgraph}
      labels={labels}
      producerOps={producerOps}
      variant="hero"
    />
  );
}
