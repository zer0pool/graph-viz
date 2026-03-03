import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDatasetsTable } from "./useDatasetsTable";
import { useApiClient } from "../../shared/api/ApiContext";

// Mock the context and API client
vi.mock("../../shared/api/ApiContext", () => ({
  useApiClient: vi.fn(),
}));

describe("useDatasetsTable", () => {
  const mockApi = {
    fetchTables: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useApiClient as any).mockReturnValue(mockApi);
  });

  it("should fetch and filter datasets", async () => {
    const mockData = [
      { name: "table_a", storage_info: { size_bytes: 1000 } },
      { name: "table_b", storage_info: { size_bytes: 2000 } },
    ];
    mockApi.fetchTables.mockResolvedValue(mockData);

    const { result } = renderHook(() => useDatasetsTable());

    // Initial state
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filteredDatasets).toHaveLength(2);
    expect(result.current.maxSize).toBe(2000);

    // Test searching
    const { result: searchResult } = renderHook(() => useDatasetsTable());
    await waitFor(() => expect(searchResult.current.loading).toBe(false));
    
    // Set search
    const { act } = await import("@testing-library/react");
    act(() => {
      searchResult.current.setSearch("table_a");
    });
    
    await waitFor(() => {
      expect(searchResult.current.filteredDatasets).toHaveLength(1);
    });
    expect(searchResult.current.filteredDatasets[0].name).toBe("table_a");
  });

  it("should handle API errors gracefully", async () => {
    mockApi.fetchTables.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useDatasetsTable());

    await waitFor(() => expect(result.current.loading).toBe(false));
    // The hook falls back to `datasetsData` on error which has 8 items
    expect(result.current.filteredDatasets).toHaveLength(8);
  });
});
