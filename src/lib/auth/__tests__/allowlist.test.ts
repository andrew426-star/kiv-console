import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "../allowlist";

describe("isAllowedEmail", () => {
  it("lets in a listed address, ignoring case and spacing", () => {
    expect(isAllowedEmail("Andrew@Example.com", "andrew@example.com")).toBe(true);
    expect(isAllowedEmail("b@example.com", " a@example.com , B@example.com ")).toBe(true);
  });

  it("keeps out anyone not listed", () => {
    expect(isAllowedEmail("intruder@gmail.com", "andrew@example.com")).toBe(false);
  });

  it("fails closed when the list is unset or empty", () => {
    expect(isAllowedEmail("andrew@example.com", undefined)).toBe(false);
    expect(isAllowedEmail("andrew@example.com", "")).toBe(false);
    expect(isAllowedEmail("andrew@example.com", " , ")).toBe(false);
  });

  it("refuses a missing email", () => {
    expect(isAllowedEmail(null, "andrew@example.com")).toBe(false);
    expect(isAllowedEmail("", "andrew@example.com")).toBe(false);
  });

  it("does not match on a substring", () => {
    expect(isAllowedEmail("drew@example.com", "andrew@example.com")).toBe(false);
  });
});
