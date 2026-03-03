import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphApiService } from "../GraphApiService";

describe("GraphApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("fetchExpand", () => {
    it("should fetch expand data with default params", async () => {
      const mockResult = { nodes: [], edges: [] };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await GraphApiService.fetchExpand("table", "my_id");
      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("node_id=table%3Amy_id&depth=1")
      );
    });

    it("should handle direction and depth params", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await GraphApiService.fetchExpand("table", "my:urn", "upstream", 3);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("node_id=my%3Aurn&depth=3&direction=upstream")
      );
    });

    it("should throw error on non-ok response", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(GraphApiService.fetchExpand("table", "id")).rejects.toThrow(
        "Graph API error (500): Internal Server Error"
      );
    });
  });

  describe("fetchTableHierarchy", () => {
    it("should fetch hierarchy for table name", async () => {
      const mockResult = { items: [] };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await GraphApiService.fetchTableHierarchy("my_table");
      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/my_table/hierarchy"));
    });

    it("should throw error on non-ok response", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(GraphApiService.fetchTableHierarchy("tab")).rejects.toThrow(
        "Hierarchy API error (404): Not Found"
      );
    });
  });

  describe("fetchBatchDetails", () => {
    it("should fetch batch details for node ids", async () => {
      const mockResult = { status: "success", results: {} };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await GraphApiService.fetchBatchDetails(["n1", "n2"]);
      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/batch-details"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ node_ids: ["n1", "n2"] }),
        })
      );
    });

    it("should return empty result for empty nodeIds", async () => {
      const result = await GraphApiService.fetchBatchDetails([]);
      expect(result.results).toEqual({});
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should throw error on non-ok response", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(GraphApiService.fetchBatchDetails(["n1"])).rejects.toThrow(
        "Batch Details API error (400): Bad Request"
      );
    });
  });
});
