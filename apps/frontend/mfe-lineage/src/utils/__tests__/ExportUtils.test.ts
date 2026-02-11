import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportUtils } from "../ExportUtils";

describe("ExportUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wrap createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement and body methods
    vi.spyOn(document, "createElement");
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => ({}) as any,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => ({}) as any,
    );
  });

  it("should export to excel when data is provided", () => {
    const mockData = {
      upstream: [
        {
          id: "t1",
          type: "table",
          depth: 0,
          properties: { storage: "S3", write_mode: "OVERWRITE" },
        },
      ],
      downstream: [
        {
          id: "t2",
          type: "table",
          depth: 2,
          properties: { storage: "BIGQUERY" },
          viaJob: { name: "Job 1", properties: { owner: "User A" } },
        },
      ],
    };

    ExportUtils.exportToExcel(mockData as any, "root_table");

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith("a");
    // Verify it tries to download
    const link = vi
      .mocked(document.createElement)
      .mock.results.find((r) => r.value?.tagName === "A")?.value;
    if (link) {
      expect(link.download).toContain("root_table");
      expect(link.download).toContain(".xls");
    }
  });

  it("should return early if no data provided", () => {
    ExportUtils.exportToExcel({ upstream: [], downstream: [] }, "root");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
