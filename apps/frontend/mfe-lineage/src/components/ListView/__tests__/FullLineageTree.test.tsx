import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FullLineageTree } from "../FullLineageTree";
import { GraphApiService } from "../../../services/GraphApiService";
import { ExportUtils } from "../../../utils/ExportUtils";
import React from "react";

vi.mock("../../../services/GraphApiService");
vi.mock("../../../utils/ExportUtils");

const mockRootNode = { id: "table1", type: "table", name: "Table 1" };

const mockRealisticTree = {
  upstream: [
    { id: "table1", type: "table", name: "Root", depth: 0 },
    { id: "job1", type: "job", name: "Job 1", depth: 1, parent: "table1" },
    { id: "up1", type: "table", name: "Upstream 1", depth: 2, parent: "job1" },
  ],
  downstream: [
    { id: "table1", type: "table", name: "Root", depth: 0 },
    { id: "job2", type: "job", name: "Job 2", depth: 1, parent: "table1" },
    {
      id: "down1",
      type: "table",
      name: "Downstream 1",
      depth: 2,
      parent: "job2",
    },
  ],
};

describe("FullLineageTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show empty message when no root node is provided", () => {
    render(<FullLineageTree rootNode={null} onSelectNode={vi.fn()} />);
    expect(
      screen.getByText(/Select a table to view full lineage/),
    ).toBeInTheDocument();
  });

  it("should show error when root node is not a table", () => {
    render(
      <FullLineageTree
        rootNode={{ id: "job1", type: "job", name: "Job 1" }}
        onSelectNode={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Full lineage is only available for tables/),
    ).toBeInTheDocument();
  });

  it("should fetch and display hierarchy data", async () => {
    (GraphApiService.fetchTableHierarchy as any).mockResolvedValue({
      tree: mockRealisticTree,
    });
    (GraphApiService.fetchBatchDetails as any).mockResolvedValue({
      results: {
        up1: { table_info: { storage_type: "S3" } },
        down1: { table_info: { storage_type: "Snf" } },
        job1: { job_info: { owner: "Alice" } },
        job2: { job_info: { owner: "Bob" } },
      },
    });

    render(
      <FullLineageTree rootNode={mockRootNode as any} onSelectNode={vi.fn()} />,
    );

    expect(screen.getByText(/Loading hierarchy.../)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Full Lineage/)).toBeInTheDocument();
      expect(screen.getAllByText("table1").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("up1")).toBeInTheDocument();
    expect(screen.getByText("down1")).toBeInTheDocument();
  });

  it("should handle fetch error", async () => {
    (GraphApiService.fetchTableHierarchy as any).mockRejectedValue(
      new Error("Fetch Failed"),
    );

    render(
      <FullLineageTree rootNode={mockRootNode as any} onSelectNode={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Error: Fetch Failed/)).toBeInTheDocument();
    });
  });

  it("should expose actions via ref", async () => {
    (GraphApiService.fetchTableHierarchy as any).mockResolvedValue({
      tree: { upstream: [], downstream: [] },
    });
    (GraphApiService.fetchBatchDetails as any).mockResolvedValue({
      results: {},
    });

    const actionRef = { current: null } as any;
    render(
      <FullLineageTree
        rootNode={mockRootNode as any}
        onSelectNode={vi.fn()}
        actionRef={actionRef}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Full Lineage/)).toBeInTheDocument();
    });

    expect(actionRef.current).not.toBeNull();
    expect(typeof actionRef.current.reload).toBe("function");
    expect(typeof actionRef.current.exportCsv).toBe("function");

    // Test reload
    await act(async () => {
      actionRef.current.reload();
    });
    expect(GraphApiService.fetchTableHierarchy).toHaveBeenCalledTimes(2);

    // Test export
    act(() => {
      actionRef.current.exportCsv();
    });
    expect(ExportUtils.exportToExcel).toHaveBeenCalled();
  });

  it("should handle row clicks and reload with new root", async () => {
    const onSelectNode = vi.fn();
    (GraphApiService.fetchTableHierarchy as any).mockResolvedValue({
      tree: mockRealisticTree,
    });
    (GraphApiService.fetchBatchDetails as any).mockResolvedValue({
      results: {
        up1: { table_info: {} },
        job1: { job_info: {} },
      },
    });

    const actionRef = { current: null } as any;
    render(
      <FullLineageTree
        rootNode={mockRootNode as any}
        onSelectNode={onSelectNode}
        actionRef={actionRef}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("up1")).toBeInTheDocument();
    });

    // Simulate click on row
    const row = screen.getByText("up1");
    act(() => {
      fireEvent.click(row);
    });

    expect(onSelectNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "up1" }),
    );
    expect(actionRef.current.isLocalSelected).toBe(true);

    // Test reload with new effective root
    await act(async () => {
      actionRef.current.reload();
    });

    await waitFor(() => {
      expect(
        screen
          .getAllByText("up1")
          .some(
            (el) =>
              el.classList.contains("root-node-name") ||
              el.classList.contains("root-table-badge"),
          ),
      ).toBe(true);
    });
  });

  it("should handle truncation and expansion with MORE node", async () => {
    // PROGRESSIVE_LOADING_LIMIT is 3 by default
    const upstream = [
      { id: "table1", type: "table", name: "Root", depth: 0 },
      { id: "job1", type: "job", depth: 1, parent: "table1" },
      { id: "up1", type: "table", depth: 2, parent: "job1" },
      { id: "up2", type: "table", depth: 2, parent: "job1" },
      { id: "up3", type: "table", depth: 2, parent: "job1" },
      { id: "up4", type: "table", depth: 2, parent: "job1" },
      { id: "up5", type: "table", depth: 2, parent: "job1" },
    ];

    (GraphApiService.fetchTableHierarchy as any).mockResolvedValue({
      tree: { upstream, downstream: [] },
    });
    (GraphApiService.fetchBatchDetails as any).mockResolvedValue({
      results: {},
    });

    render(
      <FullLineageTree rootNode={mockRootNode as any} onSelectNode={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("up1")).toBeInTheDocument();
      expect(screen.getByText("up2")).toBeInTheDocument();
      expect(screen.getByText("up3")).toBeInTheDocument();
      // up4 and up5 should be hidden initially
      expect(screen.queryByText("up4")).not.toBeInTheDocument();
      expect(screen.getByText(/2 more/)).toBeInTheDocument();
    });

    // Expand
    const moreBtn = screen.getByText(/2 more/);
    await act(async () => {
      fireEvent.click(moreBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("up4")).toBeInTheDocument();
      expect(screen.getByText("up5")).toBeInTheDocument();
      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });
  });
});
