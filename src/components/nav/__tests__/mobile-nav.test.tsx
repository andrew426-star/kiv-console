import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));

import { MobileTabBar, MobileTopBar } from "../mobile-nav";
import { NAV_ITEMS, isActive } from "../nav-items";

describe("isActive", () => {
  it("matches Home only at the root", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/launch", "/")).toBe(false);
  });

  it("matches a section and its subpages, not lookalikes", () => {
    expect(isActive("/company", "/company")).toBe(true);
    expect(isActive("/company/clients", "/company")).toBe(true);
    expect(isActive("/companyx", "/company")).toBe(false);
  });
});

describe("MobileTabBar", () => {
  it("marks the current tab and keeps the rest under More", () => {
    pathname = "/calendar";
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Portfolio" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("reaches every page between the tabs and More", () => {
    pathname = "/";
    render(<MobileTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole("link", { name: item.short })).toHaveAttribute("href", item.href);
    }
  });
});

describe("MobileTopBar", () => {
  it("names the current page", () => {
    pathname = "/intel";
    render(<MobileTopBar />);
    expect(screen.getByText("Intel Hub")).toBeInTheDocument();
  });
});
