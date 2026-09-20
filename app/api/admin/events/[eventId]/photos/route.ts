import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { s3Bucket, s3Client } from "@/lib/storage/s3";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { Role } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

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

    if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
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

    const photos = await prisma.photo.findMany({
      where: {
        eventId: parsedEventId,
      },
      select: {
        id: true,
        eventId: true,
        uploadedById: true,
        filename: true,
        storageLocation: true,
        fileSize: true,
        selectedForGallery: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const command = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: photo.storageLocation,
        });

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 10,
        });

        return {
          id: photo.id,
          eventId: photo.eventId,
          uploadedById: photo.uploadedById,
          filename: photo.filename,
          storageLocation: photo.storageLocation,
          fileSize: photo.fileSize,
          selectedForGallery: photo.selectedForGallery,
          createdAt: photo.createdAt,
          uploadedBy: photo.uploadedBy,
          url,
        };
      }),
    );

    return NextResponse.json({
      photos: photosWithUrls,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load event photos." },
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

    if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
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

    const photoId = Number(body.photoId);
    const selected = body.selected;

    if (
      !Number.isInteger(photoId) ||
      photoId <= 0 ||
      typeof selected !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Valid photo ID and selection value are required." },
        { status: 400 },
      );
    }

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        eventId: parsedEventId,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found." },
        { status: 404 },
      );
    }

    const updatedPhoto = await prisma.photo.update({
      where: {
        id: photo.id,
      },
      data: {
        selectedForGallery: selected,
      },
      select: {
        id: true,
        selectedForGallery: true,
      },
    });

    return NextResponse.json({
      photo: updatedPhoto,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update photo selection." },
      { status: 500 },
    );
  }
}