import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { Role } from "@/app/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

function generateSlug(): string {
  return crypto.randomUUID();
}

function isValidPin(pin: unknown): pin is string {
  return (
    typeof pin === "string" &&
    /^\d{4,8}$/.test(pin)
  );
}

function generatePin(): string {
  return randomInt(100000, 1000000).toString();
}

export async function GET(
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

    if (
      !Number.isInteger(parsedEventId) ||
      parsedEventId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid event ID." },
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

    const gallery = await prisma.gallery.findUnique({
      where: {
        eventId: parsedEventId,
      },
      select: {
        id: true,
        eventId: true,
        slug: true,
        published: true,
        createdAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      gallery,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load gallery." },
      { status: 500 },
    );
  }
}

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

    if (
      !Number.isInteger(parsedEventId) ||
      parsedEventId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid event ID." },
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

    const existingGallery = await prisma.gallery.findUnique({
      where: {
        eventId: parsedEventId,
      },
    });

    if (existingGallery) {
      return NextResponse.json(
        { error: "A gallery already exists for this event." },
        { status: 409 },
      );
    }

    const body = await request.json();

    const suppliedPin = body.pin;

    const pin = isValidPin(suppliedPin)
      ? suppliedPin
      : generatePin();

    const pinHash = await hashPassword(pin);

    const slug = generateSlug();

    const gallery = await prisma.gallery.create({
      data: {
        eventId: parsedEventId,
        slug,
        pinHash,
        published: false,
      },
      select: {
        id: true,
        eventId: true,
        slug: true,
        published: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        gallery,
        pin,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create gallery." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    if (
      !Number.isInteger(parsedEventId) ||
      parsedEventId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid event ID." },
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

    const body = await request.json();

    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        { error: "Published value must be true or false." },
        { status: 400 },
      );
    }

    const gallery = await prisma.gallery.findUnique({
      where: {
        eventId: parsedEventId,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found." },
        { status: 404 },
      );
    }

    const published = body.published;

    const updatedGallery = await prisma.gallery.update({
      where: {
        id: gallery.id,
      },
      data: {
        published,
        publishedAt: published
          ? gallery.publishedAt ?? new Date()
          : null,
      },
      select: {
        id: true,
        eventId: true,
        slug: true,
        published: true,
        createdAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      gallery: updatedGallery,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update gallery." },
      { status: 500 },
    );
  }
}