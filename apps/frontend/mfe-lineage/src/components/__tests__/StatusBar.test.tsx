import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBar } from "../StatusBar";
import React from "react";

describe("StatusBar", () => {
  it("should render null when not loading and no error", () => {
    const { container } = render(<StatusBar loading={false} error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render loading text when loading", () => {
    render(<StatusBar loading={true} error={null} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render error message when error occurs", () => {
    render(<StatusBar loading={false} error="API Panic" />);
    expect(screen.getByText("Error: API Panic")).toBeInTheDocument();
  });
});
