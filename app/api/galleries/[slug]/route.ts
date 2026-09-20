import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid gallery link." },
        { status: 400 },
      );
    }

    const gallery = await prisma.gallery.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        eventId: true,
        slug: true,
        published: true,
        createdAt: true,
        publishedAt: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found." },
        { status: 404 },
      );
    }

    if (!gallery.published) {
      return NextResponse.json(
        { error: "This gallery is not published." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      gallery: {
        id: gallery.id,
        eventId: gallery.eventId,
        slug: gallery.slug,
        eventName: gallery.event.name,
        published: gallery.published,
        publishedAt: gallery.publishedAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load gallery." },
      { status: 500 },
    );
  }
}