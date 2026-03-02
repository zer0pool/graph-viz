import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useJobFilter } from "../useJobFilter";
import { useApiClient } from "../../../shared/api/ApiContext";

vi.mock("../../../shared/api/ApiContext", () => ({
  useApiClient: vi.fn(),
}));

describe("useJobFilter hook", () => {
  const mockApi = {
    graphqlRequest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useApiClient as any).mockReturnValue(mockApi);
  });

  it("should perform search and return jobs", async () => {
    const dummyJobs = [
      {
        id: "j1",
        displayLabel: "One",
        config: { owner: "o", projectId: "p" },
        stats: {
          lastRunStatus: "RUNNING",
          updatedAt: "2026-03-01T00:00:00Z",
          duration: 123,
          progress: 0.42,
        },
      },
    ];
    mockApi.graphqlRequest.mockResolvedValue({ jobs: { edges: [{ node: dummyJobs[0] }] } });

    const { result } = renderHook(() => useJobFilter());
    act(() => {
      result.current.search({ searchTerm: "foo" });
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    // Use objectContaining since the adapter adds properties like job_name from displayLabel
    expect(result.current.jobs[0]).toMatchObject({
      job_id: "j1",
      job_name: "One",
      duration: 123,
      progress: 0.42,
    });
    // ensure duration/progress made it through via the new flat interface
    expect(result.current.jobs[0].duration).toBe(123);
    expect(result.current.jobs[0].progress).toBe(0.42);
    expect(mockApi.graphqlRequest).toHaveBeenCalledWith(expect.any(String), {
      filter: { searchTerm: "foo" },
    });
  });

  it("should handle errors", async () => {
    mockApi.graphqlRequest.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useJobFilter());
    act(() => {
      result.current.search({ searchTerm: "x" });
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.jobs).toEqual([]);
    expect(result.current.error).toBe("fail");
  });
});
