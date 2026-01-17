import { GraphState } from "../types/graph";
import { config } from "../config";

const API_BASE_URL = config.API_BASE_URL;

export class GraphApiService {
  static async fetchExpand(
    type: string,
    id: string,
    direction: "upstream" | "downstream" | "both" = "both",
    depth = 1,
  ): Promise<GraphState> {
    const params = new URLSearchParams({
      node_id: id.includes(":") ? id : `${type}:${id}`, // Ensure full URN if not present, though usually it is
      depth: String(depth),
    });

    // Only append direction if it's not "both" (default behavior of backend is likely both/lineage)
    if (direction !== "both") {
      params.append("direction", direction);
    }

    // Determine correct endpoint based on legacy vs new proxy
    // Using the one requested by user: /api/v1/lineage/graph
    const response = await fetch(
      `${API_BASE_URL}/api/v1/lineage/graph?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  static async fetchTableHierarchy(tableName: string): Promise<any> {
    const cleanTableName = tableName.startsWith("table:")
      ? tableName.substring(6)
      : tableName;

    const response = await fetch(
      `${API_BASE_URL}/api/v1/tables/${encodeURIComponent(
        cleanTableName,
      )}/hierarchy`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hierarchy API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  static async fetchBatchDetails(nodeIds: string[]): Promise<any> {
    if (!nodeIds || nodeIds.length === 0)
      return { status: "success", results: {} };

    const response = await fetch(
      `${API_BASE_URL}/api/v1/lineage/batch-details`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ node_ids: nodeIds }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Batch Details API error (${response.status}): ${errorText}`,
      );
    }

    return response.json();
  }
}
