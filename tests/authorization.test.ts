import { describe, expect, it } from "vitest";
import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

describe("Role-based authorization", () => {
  it("allows an ADMIN when ADMIN access is required", () => {
    expect(() => requireRole(Role.ADMIN, Role.ADMIN)).not.toThrow();
  });

  it("rejects a TEAM_MEMBER from ADMIN-only access", () => {
    expect(() => requireRole(Role.TEAM_MEMBER, Role.ADMIN)).toThrow(
      "FORBIDDEN",
    );
  });

  it("allows a TEAM_MEMBER when TEAM_MEMBER access is required", () => {
    expect(() =>
      requireRole(Role.TEAM_MEMBER, Role.TEAM_MEMBER),
    ).not.toThrow();
  });
});
