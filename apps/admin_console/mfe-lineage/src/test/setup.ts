import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Auto cleanup after each test
afterEach(() => {
  cleanup();
});

// Mermaid mock
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(() => Promise.resolve({ svg: "<svg></svg>" })),
  },
}));

// D3 mock
vi.mock("d3", () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({ remove: vi.fn() })),
    append: vi.fn(),
    attr: vi.fn(),
    call: vi.fn(),
    on: vi.fn(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => ({ on: vi.fn() })),
  })),
  zoomIdentity: { k: 1, x: 0, y: 0 },
}));
