import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ContextMenu } from "../ContextMenu";
import React from "react";

describe("ContextMenu", () => {
  const mockHandlers = {
    onClose: vi.fn(),
    onExpandUpstream: vi.fn(),
    onExpandDownstream: vi.fn(),
    onShowDetails: vi.fn(),
    onDelete: vi.fn(),
  };

  it("should render null when state is null", () => {
    const { container } = render(<ContextMenu state={null} {...mockHandlers} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render at specified position", () => {
    render(<ContextMenu state={{ x: 100, y: 200, node: {} as any }} {...mockHandlers} />);
    const menu = screen
      .getByRole("button", { name: /Expand Upstream/i })
      .closest(".floating-context-menu");
    expect(menu).toHaveStyle({ left: "100px", top: "200px" });
  });

  it("should call onExpandUpstream and onClose when clicked", () => {
    render(<ContextMenu state={{ x: 0, y: 0, node: {} as any }} {...mockHandlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Expand Upstream/i }));
    expect(mockHandlers.onExpandUpstream).toHaveBeenCalled();
    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it("should call onDelete and onClose when delete clicked", () => {
    render(<ContextMenu state={{ x: 0, y: 0, node: {} as any }} {...mockHandlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Node/i }));
    expect(mockHandlers.onDelete).toHaveBeenCalled();
    expect(mockHandlers.onClose).toHaveBeenCalled();
  });
});
