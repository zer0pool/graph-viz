import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardPage } from "../DashboardPage";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
jest.mock("../../../shared/lib/hooks/useLandingPageData", () => ({
  useLandingPageData: () => ({
    metrics: [{ type: "total_tables", value: 10, label: "Test Tables", status: "success" }],
    plots: [],
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock("../../../shared/lib/hooks/useAnalyticsData", () => ({
  useAnalyticsData: () => ({
    recentHistory: [],
    topVisited: [],
    loadingTop: false,
    refresh: jest.fn(),
  }),
}));

describe("DashboardPage", () => {
  it("renders dashboard title and metrics", () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Test Tables")).toBeInTheDocument();
  });
});
