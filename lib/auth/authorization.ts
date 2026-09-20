import { Role } from "@/generated/prisma/client";

export function requireRole(
  userRole: Role,
  requiredRole: Role,
): void {
  if (userRole !== requiredRole) {
    throw new Error("FORBIDDEN");
  }
}