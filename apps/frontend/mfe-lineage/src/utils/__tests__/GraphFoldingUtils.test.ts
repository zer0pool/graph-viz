import { describe, it, expect } from "vitest";
import { createGroupNode, applyProgressiveLoading } from "../GraphFoldingUtils";
import { mockGraphData } from "@/test/mocks/graphData";

describe("GraphFoldingUtils", () => {
  describe("createGroupNode", () => {
    it("should create a group node with correct properties", () => {
      const remainingNodes = [{ id: "node1", type: "table", name: "n1" }];
      const remainingEdges = [{ source: "node1", target: "anchor-id", type: "reads" }];
      const groupNode = createGroupNode(
        remainingNodes as any,
        remainingEdges as any,
        "anchor-id",
        "upstream"
      );

      expect(groupNode.type).toBe("group");
      expect(groupNode.name).toBe("... 1 more");
      expect(groupNode.properties.count).toBe(1);
      expect(groupNode.properties.direction).toBe("upstream");
      expect(groupNode.id).toContain("__GROUP__:anchor-id:upstream:");
    });

    it("should generate unique IDs using random/timestamp", () => {
      const group1 = createGroupNode([], [], "anchor", "upstream");
      const group2 = createGroupNode([], [], "anchor", "upstream");
      expect(group1.id).not.toBe(group2.id);
    });
  });

  describe("applyProgressiveLoading", () => {
    it("should return original data if no folding needed", () => {
      const data = mockGraphData({ upstreamCount: 2, downstreamCount: 2 });
      const result = applyProgressiveLoading(data, "table:root", 10);

      expect(result).toEqual(data);
      expect(result.nodes.filter((n) => n.type === "group")).toHaveLength(0);
    });

    it("should fold upstream nodes when exceeding limit", () => {
      // 5 upstream + 1 root = 6 total
      const data = mockGraphData({ upstreamCount: 5 });
      const result = applyProgressiveLoading(data, "table:root", 3);

      // Should have 1 (root) + 3 (visible upstream) + 1 (group) = 5 nodes
      expect(result.nodes).toHaveLength(5);
      const groupNodes = result.nodes.filter((n) => n.type === "group");
      expect(groupNodes).toHaveLength(1);
      expect(groupNodes[0].properties.direction).toBe("upstream");
      expect(groupNodes[0].properties.count).toBe(2); // 5 - 3 = 2 hidden
    });

    it("should fold downstream nodes when exceeding limit", () => {
      const data = mockGraphData({ downstreamCount: 5 });
      const result = applyProgressiveLoading(data, "table:root", 2);

      // Should have 1 (root) + 2 (visible downstream) + 1 (group) = 4 nodes
      expect(result.nodes).toHaveLength(4);
      const groupNodes = result.nodes.filter((n) => n.type === "group");
      expect(groupNodes).toHaveLength(1);
      expect(groupNodes[0].properties.direction).toBe("downstream");
      expect(groupNodes[0].properties.count).toBe(3); // 5 - 2 = 3 hidden
    });

    it("should handle independent upstream and downstream limits", () => {
      const data = mockGraphData({ upstreamCount: 5, downstreamCount: 5 });
      const result = applyProgressiveLoading(data, "table:root", {
        upstreamLimit: 2,
        downstreamLimit: 4,
      });

      const upGroup = result.nodes.find(
        (n) => n.type === "group" && n.properties.direction === "upstream"
      );
      const downGroup = result.nodes.find(
        (n) => n.type === "group" && n.properties.direction === "downstream"
      );

      expect(upGroup?.properties.count).toBe(3); // 5 - 2
      expect(downGroup?.properties.count).toBe(1); // 5 - 4
    });

    it("should correctly preserve edges for visible nodes", () => {
      const data = mockGraphData({ upstreamCount: 2 });
      const result = applyProgressiveLoading(data, "table:root", 5);

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].source).toBe("job:upstream-0");
      expect(result.edges[0].target).toBe("table:root");
    });

    it("should create group edges for folded nodes", () => {
      const data = mockGraphData({ upstreamCount: 5 });
      const result = applyProgressiveLoading(data, "table:root", 2);

      const groupNode = result.nodes.find((n) => n.type === "group");
      const groupEdge = result.edges.find((e) => e.type === "group-edge");

      expect(groupEdge).toBeDefined();
      expect(groupEdge?.source).toBe(groupNode?.id);
      expect(groupEdge?.target).toBe("table:root");
    });
  });
});
