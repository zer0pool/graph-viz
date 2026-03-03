import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useJobLanding } from "../useJobLanding";
import { useLandingPageData } from "../../../shared/hooks/useLandingPageData";

// Mock the landing page data hook
vi.mock("../../../shared/hooks/useLandingPageData", () => ({
  useLandingPageData: vi.fn(),
}));

describe("useJobLanding hook", () => {
  const baseResponse = {
    metrics: [],
    entities: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useLandingPageData as any).mockReturnValue({ ...baseResponse });
  });

  it("should map landing page data into hook output", async () => {
    const mockJobs = [
      {
        id: "j1",
        displayLabel: "Job One",
        config: { owner: "alice", projectId: "proj" },
        stats: {
          lastRunStatus: "SUCCESS",
          updatedAt: "2026-02-25T00:00:00Z",
          duration: 200,
          progress: 0.5,
        },
      },
    ];
    const mockMetrics = [{ type: "total_jobs", value: 5, label: "Total Jobs" }];

    (useLandingPageData as any).mockReturnValue({
      ...baseResponse,
      metrics: mockMetrics,
      entities: { edges: [{ node: mockJobs[0] }] },
    });

    const { result } = renderHook(() => useJobLanding());

    expect(result.current.loading).toBe(false);
    expect(result.current.jobs).toEqual(mockJobs);
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].value).toBe(5);
    // job stats should include our dummy duration and progress
    expect(result.current.jobs[0].stats?.duration).toBe(200);
    expect(result.current.jobs[0].stats?.progress).toBe(0.5);
    expect(result.current.error).toBeNull();
  });

  it("should surface errors from landing page hook", async () => {
    (useLandingPageData as any).mockReturnValue({
      ...baseResponse,
      error: new Error("bad things"),
    });

    const { result } = renderHook(() => useJobLanding());

    expect(result.current.loading).toBe(false);
    expect(result.current.jobs).toEqual([]);
    expect(result.current.error).toBe("bad things");
  });

  it("should return correct status colors", () => {
    const { result } = renderHook(() => useJobLanding());

    expect(result.current.getStatusColor("SUCCESS")).toContain("green");
    expect(result.current.getStatusColor("RUNNING")).toContain("blue");
    expect(result.current.getStatusColor("FAILED")).toContain("red");
  });
});
