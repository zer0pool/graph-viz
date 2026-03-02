import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardMetrics } from "../useDashboardMetrics";

// Mock global fetch
global.fetch = jest.fn();

describe("useDashboardMetrics", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("should return initial loadd state and default metrics", () => {
    const { result } = renderHook(() => useDashboardMetrics());

    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toHaveLength(5); // Default metrics count
    expect(result.current.metrics[0].type).toBe("total_tables");
  });

  it("should return fetched metrics on success", async () => {
    const mockData = {
      metrics: [{ type: "total_jobs", value: 100, subtext: "Active Jobs" }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].value).toBe(100);
  });
});
