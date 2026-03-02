import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GraphCanvas } from "../GraphCanvas";
import React from "react";

describe("GraphCanvas", () => {
  it("should render the mermaid container", () => {
    render(<GraphCanvas loading={false} error={null} isEmpty={true} />);
    const container = document.getElementById("mermaid-container");
    expect(container).toBeInTheDocument();
  });

  it("should display loading spinner when loading is true", () => {
    const { container } = render(<GraphCanvas loading={true} error={null} isEmpty={true} />);
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("should display error message when error is provided", () => {
    render(<GraphCanvas loading={false} error="Test Error" isEmpty={true} />);
    expect(screen.getByText(/Error loading graph: Test Error/)).toBeInTheDocument();
  });

  it("should correctly forward ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<GraphCanvas loading={false} error={null} isEmpty={true} ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe("mermaid-container");
  });
});
