import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
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
      requireRole(session.user.role, Role.ADMIN);
    } catch {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 },
      );
    }

    const teamMembers = await prisma.user.findMany({
      where: {
        role: Role.TEAM_MEMBER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      teamMembers,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load team members." },
      { status: 500 },
    );
  }
}

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

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const teamMember = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        teamMember,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create team member." },
      { status: 500 },
    );
  }
}