import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { Role } from "@/app/generated/prisma/client";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    try {
      requireRole(session.user.role, Role.TEAM_MEMBER);
    } catch {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 },
      );
    }

    const memberships = await prisma.eventMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      events: memberships.map((membership) => membership.event),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load assigned events." },
      { status: 500 },
    );
  }
}