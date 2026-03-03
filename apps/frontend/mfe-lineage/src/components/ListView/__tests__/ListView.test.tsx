import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListView } from "../ListView";
import React from "react";

// Mock FullLineageTree to simplify ListView testing
vi.mock("../FullLineageTree", () => ({
  FullLineageTree: ({ rootNode }: any) => (
    <div data-testid="full-lineage-tree">Root: {rootNode?.id || "None"}</div>
  ),
}));

const mockGraphData = {
  nodes: [
    { id: "table:t1", type: "table", name: "T1" },
    { id: "job:j1", type: "job", name: "J1" },
  ],
  edges: [{ source: "job:j1", target: "table:t1" }],
};

describe("ListView", () => {
  it("should resolve root table when searched by table (exists in graph)", () => {
    render(
      <ListView
        graphData={mockGraphData as any}
        selectedNode={null}
        defaultRootNode={{ type: "table", id: "t1" }}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText("Root: table:t1")).toBeInTheDocument();
  });

  it("should resolve root table when searched by table (not in graph)", () => {
    render(
      <ListView
        graphData={mockGraphData as any}
        selectedNode={null}
        defaultRootNode={{
          type: "table",
          id: "missing",
          tableName: "Missing Table",
        }}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText("Root: missing")).toBeInTheDocument();
  });

  it("should resolve root table when searched by job (write edge found)", () => {
    render(
      <ListView
        graphData={mockGraphData as any}
        selectedNode={null}
        defaultRootNode={{ type: "job", id: "j1" }}
        onSelectNode={vi.fn()}
      />
    );
    // job:j1 writes to table:t1
    expect(screen.getByText("Root: table:t1")).toBeInTheDocument();
  });

  it("should resolve root table when searched by job (any edge found)", () => {
    const customGraph = {
      nodes: [
        { id: "table:t2", type: "table", name: "T2" },
        { id: "job:j2", type: "job", name: "J2" },
      ],
      edges: [
        { source: "table:t2", target: "job:j2" }, // Job reads from T2
      ],
    };
    render(
      <ListView
        graphData={customGraph as any}
        selectedNode={null}
        defaultRootNode={{ type: "job", id: "j2" }}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText("Root: table:t2")).toBeInTheDocument();
  });

  it("should use selectedNode if it is a table", () => {
    render(
      <ListView
        graphData={mockGraphData as any}
        selectedNode={{ id: "table:selected", type: "table", name: "Selected" }}
        defaultRootNode={{ type: "table", id: "t1" }}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText("Root: table:selected")).toBeInTheDocument();
  });

  it("should fallback to initialRootTable if selectedNode is a job", () => {
    render(
      <ListView
        graphData={mockGraphData as any}
        selectedNode={{ id: "job:j1", type: "job", name: "J1" }}
        defaultRootNode={{ type: "table", id: "t1" }}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText("Root: table:t1")).toBeInTheDocument();
  });
});
