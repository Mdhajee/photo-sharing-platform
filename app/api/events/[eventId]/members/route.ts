import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { Role } from "@/app/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    try {
      requireRole(session.user.role, Role.ADMIN);
    } catch {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 },
      );
    }

    const { eventId } = await params;
    const parsedEventId = Number(eventId);

    if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event ID." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const teamMemberId =
      typeof body.teamMemberId === "number"
        ? body.teamMemberId
        : Number(body.teamMemberId);

    if (!Number.isInteger(teamMemberId) || teamMemberId <= 0) {
      return NextResponse.json(
        { error: "Valid team member ID is required." },
        { status: 400 },
      );
    }

    const event = await prisma.event.findFirst({
      where: {
        id: parsedEventId,
        createdById: session.user.id,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const teamMember = await prisma.user.findUnique({
      where: {
        id: teamMemberId,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found." },
        { status: 404 },
      );
    }

    if (teamMember.role !== Role.TEAM_MEMBER) {
      return NextResponse.json(
        { error: "Selected user is not a team member." },
        { status: 400 },
      );
    }

    const existingMembership = await prisma.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId: parsedEventId,
          userId: teamMemberId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Team member is already assigned to this event." },
        { status: 409 },
      );
    }

    const membership = await prisma.eventMember.create({
      data: {
        eventId: parsedEventId,
        userId: teamMemberId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        member: membership.user,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to assign team member." },
      { status: 500 },
    );
  }
}