import { GraphState, GraphNode, GraphEdge } from "@/types/graph";

interface MockGraphOptions {
  nodeCount?: number;
  upstreamCount?: number;
  downstreamCount?: number;
}

export function mockGraphData(options: MockGraphOptions = {}): GraphState {
  const { nodeCount = 5, upstreamCount = 0, downstreamCount = 0 } = options;

  const rootNode: GraphNode = {
    id: "table:root",
    type: "table",
    name: "root_table",
    full_name: "db.schema.root_table",
  };

  const nodes: GraphNode[] = [rootNode];
  const edges: GraphEdge[] = [];

  // Add upstream nodes
  for (let i = 0; i < upstreamCount; i++) {
    const jobNode: GraphNode = {
      id: `job:upstream-${i}`,
      type: "job",
      name: `upstream_job_${i}`,
      full_name: `upstream_job_${i}`,
    };
    nodes.push(jobNode);
    edges.push({
      source: jobNode.id,
      target: rootNode.id,
      type: "writes",
    });
  }

  // Add downstream nodes
  for (let i = 0; i < downstreamCount; i++) {
    const jobNode: GraphNode = {
      id: `job:downstream-${i}`,
      type: "job",
      name: `downstream_job_${i}`,
      full_name: `downstream_job_${i}`,
    };
    nodes.push(jobNode);
    edges.push({
      source: rootNode.id,
      target: jobNode.id,
      type: "reads",
    });
  }

  // Fill up to nodeCount if needed
  while (nodes.length < nodeCount) {
    const id = `extra-${nodes.length}`;
    nodes.push({ id, type: "table", name: id });
  }

  return { nodes, edges };
}

export const mockTableNode: GraphNode = {
  id: "table:test",
  type: "table",
  name: "test_table",
  full_name: "db.schema.test_table",
  platform: "snowflake",
};

export const mockJobNode: GraphNode = {
  id: "job:test",
  type: "job",
  name: "test_job",
  full_name: "test_job",
  status: "success",
};
