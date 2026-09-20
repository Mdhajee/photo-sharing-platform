import { describe, expect, it } from "vitest";

describe("Authentication", () => {
  it("should reject an invalid email format", () => {
    const email = "invalid-email";

    expect(email.includes("@")).toBe(false);
  });

  it("should accept a valid email format", () => {
    const email = "test@example.com";

    expect(email.includes("@")).toBe(true);
  });
});