import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createGalleryAccessToken } from "@/lib/gallery/access-token";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
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

    const body = await request.json();

    const pin =
      typeof body.pin === "string"
        ? body.pin.trim()
        : "";

    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: "A valid gallery PIN is required." },
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
        pinHash: true,
        published: true,
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

    const validPin = await verifyPassword(
      pin,
      gallery.pinHash,
    );

    if (!validPin) {
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { status: 401 },
      );
    }

    const accessToken = createGalleryAccessToken(
      gallery.slug,
    );

    const response = NextResponse.json({
      verified: true,
      gallery: {
        id: gallery.id,
        eventId: gallery.eventId,
        slug: gallery.slug,
      },
    });

    response.cookies.set({
      name: "gallery_access",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to verify gallery PIN." },
      { status: 500 },
    );
  }
}