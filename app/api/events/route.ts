import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { Role } from "@/generated/prisma/client";

export async function POST(request: Request) {
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

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        name,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        event: {
          id: event.id,
          name: event.name,
          createdAt: event.createdAt,
          createdById: event.createdById,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create event." },
      { status: 500 },
    );
  }
}

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
      requireRole(session.user.role, Role.ADMIN);
    } catch {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 },
      );
    }

    const events = await prisma.event.findMany({
      where: {
        createdById: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      events,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load events." },
      { status: 500 },
    );
  }
}