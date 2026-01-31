import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTrendsSection } from "./useTrendsSection";
import { useApiClient } from "../../shared/api/ApiContext";

vi.mock("../../shared/api/ApiContext", () => ({
  useApiClient: vi.fn(),
}));

describe("useTrendsSection", () => {
  const mockApi = {
    fetchSummaryMetrics: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useApiClient as any).mockReturnValue(mockApi);
  });

  it("should fetch trend data or use fallbacks", async () => {
    const mockTrends = {
      totalTables: 2000,
      tablesTrend: [{ day: "Day 1", tables: 1000 }],
    };
    mockApi.fetchSummaryMetrics.mockResolvedValue({ trends: mockTrends });

    const { result } = renderHook(() => useTrendsSection());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalTables).toBe(2000);
    expect(result.current.tablesTrend).toHaveLength(1);
    expect(result.current.tablesTrend[0].tables).toBe(1000);
  });

  it("should use fallback data on API error", async () => {
    mockApi.fetchSummaryMetrics.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useTrendsSection());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should match default mock data in the hook
    expect(result.current.totalTables).toBe(1548);
    expect(result.current.tablesTrend).toHaveLength(7);
  });
});
