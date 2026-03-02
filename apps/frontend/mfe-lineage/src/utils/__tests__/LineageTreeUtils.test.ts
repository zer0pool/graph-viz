import { describe, it, expect } from "vitest";
import { LineageTreeUtils } from "../LineageTreeUtils";

describe("LineageTreeUtils", () => {
  describe("buildFlatTree", () => {
    it("should return empty list for empty input", () => {
      expect(LineageTreeUtils.buildFlatTree([])).toEqual([]);
      expect(LineageTreeUtils.buildFlatTree(null as any)).toEqual([]);
    });

    it("should build a simple tree with one root", () => {
      const items = [{ id: "root", name: "Root Table", type: "table", depth: 0 }];
      const result = LineageTreeUtils.buildFlatTree(items);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("root");
      expect(result[0].treePrefix).toBe("");
    });

    it("should handle Table -> Job -> Table hierarchy", () => {
      const items = [
        { id: "root", name: "Root", type: "table", depth: 0 },
        { id: "job1", name: "Job 1", type: "job", depth: 1, parent: "root" },
        {
          id: "table2",
          name: "Table 2",
          type: "table",
          depth: 2,
          parent: "job1",
        },
      ];
      const result = LineageTreeUtils.buildFlatTree(items);

      // result should be [Root, Table 2 (via Job 1)]
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("root");
      expect(result[1].id).toBe("table2");
      expect(result[1].viaJob?.id).toBe("job1");
      expect(result[1].treePrefix).toBe("└ ");
    });

    it("should sort children by id", () => {
      const items = [
        { id: "root", name: "Root", type: "table", depth: 0 },
        { id: "job1", name: "Job 1", type: "job", depth: 1, parent: "root" },
        { id: "table-b", name: "B", type: "table", depth: 2, parent: "job1" },
        { id: "table-a", name: "A", type: "table", depth: 2, parent: "job1" },
      ];
      const result = LineageTreeUtils.buildFlatTree(items);
      expect(result[1].id).toBe("table-a");
      expect(result[2].id).toBe("table-b");
    });

    it("should truncate when exceeding limit", () => {
      const items = [
        { id: "root", name: "Root", type: "table", depth: 0 },
        { id: "job1", name: "Job 1", type: "job", depth: 1, parent: "root" },
      ];
      // Add 5 tables under job1
      for (let i = 0; i < 5; i++) {
        items.push({
          id: `t${i}`,
          name: `T${i}`,
          type: "table",
          depth: 2,
          parent: "job1",
        });
      }

      const result = LineageTreeUtils.buildFlatTree(items, undefined, 2);
      // Expected: root, t0, t1, more node
      expect(result).toHaveLength(4);
      expect(result[1].id).toBe("t0");
      expect(result[2].id).toBe("t1");
      expect(result[3].type).toBe("MORE");
      expect(result[3].name).toBe("... 3 more");
    });

    it("should not truncate if group is expanded", () => {
      const items = [
        { id: "root", name: "Root", type: "table", depth: 0 },
        { id: "job1", name: "Job 1", type: "job", depth: 1, parent: "root" },
      ];
      for (let i = 0; i < 5; i++) {
        items.push({
          id: `t${i}`,
          name: `T${i}`,
          type: "table",
          depth: 2,
          parent: "job1",
        });
      }

      const expanded = new Set(["root"]);
      const result = LineageTreeUtils.buildFlatTree(items, expanded, 2);
      // All 5 tables should be visible + root = 6
      expect(result).toHaveLength(6);
      expect(result.some((n) => n.type === "MORE")).toBe(false);
    });

    it("should recurse deeply for multi-level lineage", () => {
      const items = [
        { id: "root", name: "Root", type: "table", depth: 0 },
        { id: "job1", name: "Job 1", type: "job", depth: 1, parent: "root" },
        { id: "t2", name: "T2", type: "table", depth: 2, parent: "job1" },
        { id: "job2", name: "Job 2", type: "job", depth: 3, parent: "t2" },
        { id: "t3", name: "T3", type: "table", depth: 4, parent: "job2" },
      ];
      const result = LineageTreeUtils.buildFlatTree(items);
      expect(result).toHaveLength(3);
      expect(result[2].id).toBe("t3");
      expect(result[2].viaJob?.id).toBe("job2");
      expect(result[2].treePrefix).toBe("  └ ");
    });
  });

  describe("getCounts", () => {
    it("should correctly count tables and unique jobs", () => {
      const items = [
        { id: "t1", type: "table", name: "T1" },
        { id: "j1", type: "job", name: "Job A" },
        { id: "j2", type: "job", name: "Job A" }, // Same name
        { id: "j3", type: "job", name: "Job B" },
        { id: "t2", depth: 0, name: "T2" }, // Depth 0 counts as table
      ];
      const counts = LineageTreeUtils.getCounts(items);
      expect(counts.t).toBe(2); // t1, t2
      expect(counts.j).toBe(2); // Job A, Job B
    });
  });
});
