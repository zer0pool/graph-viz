import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { JobTopLists } from "./JobTopLists";
import { JobRankingItem } from "../../widgets/job-landing/useJobLanding";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<JobRankingItem> = {}): JobRankingItem {
  return {
    jobId: "project.JOB_001",
    type: "SELF-TYPE",
    valueYesterday: 100,
    value7dAvg: 90,
    changePct: 11.1,
    history7d: [80, 85, 88, 90, 92, 95, 100],
    ...overrides,
  };
}

function makeItems(n: number): JobRankingItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem({ jobId: `project.JOB_${String(i).padStart(3, "0")}`, valueYesterday: 1000 - i * 10 })
  );
}

const SLOT_ITEMS = makeItems(30);
const DURATION_ITEMS = makeItems(30).map((item) => ({
  ...item,
  jobId: item.jobId.replace("project", "duration-project"),
}));

// ---------------------------------------------------------------------------
// A. Rendering
// ---------------------------------------------------------------------------

describe("JobTopLists — rendering", () => {
  it("renders slot card title", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    expect(screen.getByText(/Top \d+ Jobs by Slot Usage/)).toBeInTheDocument();
  });

  it("renders duration card title", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    expect(screen.getByText(/Top \d+ Long Running Jobs/)).toBeInTheDocument();
  });

  it("shows 5 rows per card by default", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    // 5 slot rows + 5 duration rows = 10 rank labels #1..#5 in each card
    const rankLabels = screen.getAllByText(/^#[1-5]$/);
    expect(rankLabels.length).toBe(10); // 5 per card × 2 cards
  });

  it("renders sparkline SVG for each row", () => {
    const { getAllByTestId } = render(
      <JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />
    );
    // 5 slot rows + 5 duration rows = 10 sparklines by default
    expect(getAllByTestId("sparkline").length).toBe(10);
  });

  it("renders job name (last segment of jobId)", () => {
    const items = [makeItem({ jobId: "my-project.COOL_JOB_001" })];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    expect(screen.getByText("COOL_JOB_001")).toBeInTheDocument();
  });

  it("renders project badge (first segment of jobId)", () => {
    const items = [makeItem({ jobId: "my-project.COOL_JOB_001" })];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    // project badge appears at least once
    expect(screen.getAllByText("my-project").length).toBeGreaterThan(0);
  });

  it("uses mock data when no props are passed", () => {
    render(<JobTopLists />);
    // Should render without error and show at least one rank label
    expect(screen.getAllByText(/^#1$/).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// B. Trend badge
// ---------------------------------------------------------------------------

describe("JobTopLists — trend badge", () => {
  it("shows up-arrow badge when changePct > 1", () => {
    const items = [makeItem({ changePct: 5.0 })];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    expect(screen.getByText(/\+5\.0%/)).toBeInTheDocument();
  });

  it("shows down-arrow badge when changePct < -1", () => {
    const items = [makeItem({ changePct: -3.5 })];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    expect(screen.getByText(/3\.5%/)).toBeInTheDocument();
  });

  it("shows 'flat' badge when |changePct| <= 1", () => {
    const items = [makeItem({ changePct: 0.5 })];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    expect(screen.getAllByText("flat").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. Limit selector
// ---------------------------------------------------------------------------

describe("JobTopLists — limit selector", () => {
  it("shows limit options [5, 10, 30]", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    // Each card has its own LimitSelector, so "5", "10", "30" appear multiple times
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
  });

  it("clicking limit 10 shows 10 rows per card", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    // Click '10' in the first LimitSelector (slot card)
    const tenButtons = screen.getAllByText("10");
    fireEvent.click(tenButtons[0]);

    // Now both cards should show 10 rows each (shared limit state)
    const rankLabels = screen.getAllByText(/^#10$/);
    expect(rankLabels.length).toBe(2);
  });

  it("clicking limit 30 shows up to 30 rows when data is available", () => {
    render(<JobTopLists slotRanking={SLOT_ITEMS} durationRanking={DURATION_ITEMS} />);
    const thirtyButtons = screen.getAllByText("30");
    fireEvent.click(thirtyButtons[0]);

    const rankLabels = screen.getAllByText(/^#30$/);
    expect(rankLabels.length).toBe(2);
  });

  it("does not exceed data length even when limit is larger", () => {
    const smallItems = makeItems(3);
    render(<JobTopLists slotRanking={smallItems} durationRanking={smallItems} />);

    const thirtyButtons = screen.getAllByText("30");
    fireEvent.click(thirtyButtons[0]);

    // Only 3 items exist, so #4 should not appear
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D. Sparkline SVG structure
// ---------------------------------------------------------------------------

describe("JobTopLists — sparkline SVG", () => {
  it("always renders exactly 7 rect slots regardless of data length", () => {
    // 7 values → 7 rects
    const items7 = [makeItem({ history7d: [1, 2, 3, 4, 5, 6, 7] })];
    const { getByTestId, rerender } = render(
      <JobTopLists slotRanking={items7} durationRanking={[]} />
    );
    expect(getByTestId("sparkline").querySelectorAll("rect").length).toBe(7);

    // 3 values → still 7 rects (4 ghost + 3 real)
    const items3 = [makeItem({ history7d: [10, 20, 30] })];
    rerender(<JobTopLists slotRanking={items3} durationRanking={[]} />);
    expect(getByTestId("sparkline").querySelectorAll("rect").length).toBe(7);
  });

  it("ghost bars appear for missing slots (fill ends with 20)", () => {
    const items = [makeItem({ history7d: [10, 20, 30] })]; // 3 values → 4 ghost bars
    const { getByTestId } = render(
      <JobTopLists slotRanking={items} durationRanking={[]} />
    );
    const rects = Array.from(getByTestId("sparkline").querySelectorAll("rect"));
    // First 4 are ghost bars
    expect(rects[0].getAttribute("fill")).toMatch(/20$/);
    expect(rects[3].getAttribute("fill")).toMatch(/20$/);
    // Last 3 are real bars
    expect(rects[4].getAttribute("fill")).not.toMatch(/20$/);
  });

  it("last bar is fully opaque and prior real bars are semi-transparent", () => {
    const items = [makeItem({ history7d: [10, 20, 30, 40, 50, 60, 70] })];
    const { getByTestId } = render(
      <JobTopLists slotRanking={items} durationRanking={[]} />
    );
    const rects = Array.from(getByTestId("sparkline").querySelectorAll("rect"));
    // Last bar: solid color (no alpha suffix)
    expect(rects[6].getAttribute("fill")).not.toMatch(/66$|20$/);
    // First 6 bars: semi-transparent
    expect(rects[0].getAttribute("fill")).toMatch(/66$/);
  });

  it("SVG has preserveAspectRatio=none for full-width stretch", () => {
    const items = [makeItem()];
    const { getByTestId } = render(
      <JobTopLists slotRanking={items} durationRanking={[]} />
    );
    expect(getByTestId("sparkline").getAttribute("preserveAspectRatio")).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// E. Empty / edge cases
// ---------------------------------------------------------------------------

describe("JobTopLists — edge cases", () => {
  it("renders without error when both rankings are empty", () => {
    render(<JobTopLists slotRanking={[]} durationRanking={[]} />);
    expect(screen.getByText(/Top \d+ Jobs by Slot Usage/)).toBeInTheDocument();
  });

  it("handles single-item ranking", () => {
    const items = [makeItem()];
    render(<JobTopLists slotRanking={items} durationRanking={[]} />);
    expect(screen.getByText("JOB_001")).toBeInTheDocument();
  });
});
