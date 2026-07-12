import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

describe("Home", () => {
  it("renders the K.I.V. foundation placeholder", () => {
    render(<Home />);
    expect(screen.getByText("K.I.V.")).toBeInTheDocument();
  });
});
