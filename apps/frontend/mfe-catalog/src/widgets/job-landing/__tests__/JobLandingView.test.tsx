import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { JobLandingView } from "../JobLandingView";
import { useJobFilter } from "../useJobFilter";

vi.mock("../useJobFilter");
const mockedUseJobFilter = useJobFilter as unknown as { mockReturnValue: (v: any) => void };

const mockJobs: any[] = [];
const mockMetrics: any[] = [];
const noop = () => {};
const getStatusColor = () => "";

describe("JobLandingView", () => {
  beforeEach(() => {
    // default hook return - no filtering
    mockedUseJobFilter.mockReturnValue({ jobs: [], loading: false, error: null, search: vi.fn() });
  });

  it("shows a filter toggle and opens a side panel when clicked", () => {
    render(
      <JobLandingView
        jobs={mockJobs}
        metrics={mockMetrics}
        loading={false}
        error={null}
        onRefresh={noop}
        onNavigateToJob={noop}
        getStatusColor={getStatusColor}
      />
    );

    // header should render
    expect(screen.getByText("Job Monitoring")).toBeInTheDocument();
    // there should be a button that toggles filters
    const filterButton = screen.getByRole("button", { name: /show filters/i });
    expect(filterButton).toBeInTheDocument();

    // table should still have duration/progress headers
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();

    // open filter panel
    fireEvent.click(filterButton);
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).toBeNull(); // Status is not a filter
    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();

    // close filter panel
    fireEvent.click(
      screen.getByRole("button", { name: /close filters/i, hidden: true }) ||
        screen.getByText("Clear All").parentElement?.parentElement?.querySelector("button")
    );

    // open columns popover
    const columnsButton = screen.getByRole("button", { name: /show columns/i });
    fireEvent.click(columnsButton);
    expect(screen.getByText("Show columns")).toBeInTheDocument();

    // toggle off status column and close popover
    const statusCheckbox = screen.getByLabelText("Status");
    fireEvent.click(statusCheckbox);

    // close columns popover
    fireEvent.click(columnsButton);

    // after closing, status header should not be visible
    expect(screen.queryByText("Status")).toBeNull();
  });

  it("applies filters and displays filtered job list", async () => {
    // stub the filter hook to return a couple of jobs after search
    mockedUseJobFilter.mockReturnValue({
      jobs: [{ job_id: "j1", job_name: "Filtered", project_id: "p", owners: ["o"] }],
      loading: false,
      error: null,
      search: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <JobLandingView
        jobs={mockJobs}
        metrics={mockMetrics}
        loading={false}
        error={null}
        onRefresh={noop}
        onNavigateToJob={noop}
        getStatusColor={getStatusColor}
      />
    );

    // open columns popover
    const columnsButton = screen.getByRole("button", { name: /show columns/i });
    fireEvent.click(columnsButton);

    // toggle off "Project" column
    const projectCheckbox = screen.getByLabelText("Project");
    fireEvent.click(projectCheckbox);

    // close columns popover
    fireEvent.click(columnsButton);

    const filterButton = screen.getByRole("button", { name: /show filters/i });
    fireEvent.click(filterButton);

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "foo" } });

    const applyBtn = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyBtn);

    // after applying, the filtered job should appear in table
    expect(await screen.findByText("Filtered")).toBeInTheDocument();
  });
});
