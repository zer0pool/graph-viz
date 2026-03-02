import { describe, it, expect } from "vitest";
import { MermaidDslService } from "../mermaidDslService";
import { mockGraphData } from "@/test/mocks/graphData";

describe("MermaidDslService", () => {
  describe("getShortenedName", () => {
    it("should shorten long table names", () => {
      expect(
        MermaidDslService.getShortenedName(
          "db.schema.very_long_table_name_that_needs_truncation",
          "table"
        )
      ).toBe("very_long_table_name_t...");
    });

    it("should handle s3 paths", () => {
      expect(MermaidDslService.getShortenedName("s3://my-bucket/path/to/data", "table")).toBe(
        "s3://my-bucket"
      );
    });

    it("should handle dot-separated names", () => {
      expect(MermaidDslService.getShortenedName("database.schema.table", "table")).toBe("table");
    });

    it("should handle slash-separated names", () => {
      expect(MermaidDslService.getShortenedName("projects/p1/datasets/d1/table1", "table")).toBe(
        "table1"
      );
    });

    it("should handle empty name", () => {
      expect(MermaidDslService.getShortenedName("", "table")).toBe("");
    });
  });

  describe("sanitizeId", () => {
    it("should replace dots and colons with underscores", () => {
      expect(MermaidDslService.sanitizeId("table:my.db.name")).toBe("table_my_db_name");
    });

    it("should handle leading numbers", () => {
      expect(MermaidDslService.sanitizeId("123-node")).toBe("n_123_node");
    });
  });

  describe("generate", () => {
    it("should return empty string for empty graph", () => {
      expect(
        MermaidDslService.generate({
          graphData: { nodes: [], edges: [] },
          orientation: "LR",
          layout: "dagre",
        })
      ).toBe("");
    });

    it("should generate valid DSL with nodes and styles", () => {
      const graphData = mockGraphData({ nodeCount: 1 });
      const dsl = MermaidDslService.generate({
        graphData,
        orientation: "LR",
        layout: "dagre",
      });

      expect(dsl).toContain("flowchart LR");
      expect(dsl).toContain("classDef assetNode");
      expect(dsl).toContain("table_root@{ label:");
      expect(dsl).toContain("defaultRenderer: dagre-wrapper");
    });

    it("should use elk renderer when requested", () => {
      const graphData = mockGraphData({ nodeCount: 1 });
      const dsl = MermaidDslService.generate({
        graphData,
        orientation: "TB",
        layout: "elk",
      });
      expect(dsl).toContain("flowchart TB");
      expect(dsl).toContain("defaultRenderer: elk");
    });

    it("should generate edges with labels for table -> job", () => {
      const graphData = {
        nodes: [
          { id: "t1", type: "table", name: "T1" },
          { id: "j1", type: "job", name: "J1" },
        ],
        edges: [{ source: "t1", target: "j1", type: "reads" }],
      };
      const dsl = MermaidDslService.generate({
        graphData: graphData as any,
        orientation: "LR",
        layout: "dagre",
      });

      expect(dsl).toContain("t1 -- reads --> j1");
    });

    it("should generate edges with labels for job -> table", () => {
      const graphData = {
        nodes: [
          { id: "j1", type: "job", name: "J1" },
          { id: "t1", type: "table", name: "T1" },
        ],
        edges: [{ source: "j1", target: "t1" }],
      };
      const dsl = MermaidDslService.generate({
        graphData: graphData as any,
        orientation: "LR",
        layout: "dagre",
      });

      expect(dsl).toContain("j1 -- writes --> t1");
    });

    it("should handle group nodes in DSL", () => {
      const graphData = {
        nodes: [
          { id: "root", type: "table", name: "Root" },
          {
            id: "group1",
            type: "group",
            name: "... 10 more",
            properties: { direction: "upstream" },
          },
        ],
        edges: [{ source: "group1", target: "root", type: "group-edge" }],
      };
      const dsl = MermaidDslService.generate({
        graphData: graphData as any,
        orientation: "LR",
        layout: "dagre",
      });

      expect(dsl).toContain('group1("... 10 more")');
      expect(dsl).toContain("group1:::groupNode");
      // group1 is upstream group, edge to root should have writes label if source is group and isUpstreamGroup
      expect(dsl).toContain("group1 -- writes --> root");
    });

    it("should handle downstream group nodes in DSL", () => {
      const graphData = {
        nodes: [
          { id: "root", type: "table", name: "Root" },
          {
            id: "group2",
            type: "group",
            name: "... 5 more",
            properties: { direction: "downstream" },
          },
        ],
        edges: [{ source: "root", target: "group2" }],
      };
      const dsl = MermaidDslService.generate({
        graphData: graphData as any,
        orientation: "LR",
        layout: "dagre",
      });

      expect(dsl).toContain("root -- reads --> group2");
    });
  });
});
