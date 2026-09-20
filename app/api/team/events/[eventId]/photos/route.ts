import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorization";
import { Role } from "@/app/generated/prisma/client";
import { s3Bucket, s3Client } from "@/lib/storage/s3";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
      requireRole(session.user.role, Role.TEAM_MEMBER);
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

    const membership = await prisma.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId: parsedEventId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not assigned to this event." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("photos");

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required." },
        { status: 400 },
      );
    }

    const uploadedPhotos = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Invalid photo upload." },
          { status: 400 },
        );
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error:
              "Only JPEG, PNG, and WebP images are allowed.",
          },
          { status: 400 },
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: "Uploaded photos cannot be empty." },
          { status: 400 },
        );
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const storageKey =
        `events/${parsedEventId}/photos/${randomUUID()}.${extension}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: file.type,
        }),
      );

      const photo = await prisma.photo.create({
        data: {
          eventId: parsedEventId,
          uploadedById: session.user.id,
          filename: file.name,
          storageLocation: storageKey,
          fileSize: file.size,
        },
      });

      uploadedPhotos.push({
        id: photo.id,
        eventId: photo.eventId,
        filename: photo.filename,
        fileSize: photo.fileSize,
        createdAt: photo.createdAt,
      });
    }

    return NextResponse.json(
      {
        photos: uploadedPhotos,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Photo upload error:", error);

    return NextResponse.json(
      { error: "Unable to upload photos." },
      { status: 500 },
    );
  }
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
      requireRole(session.user.role, Role.TEAM_MEMBER);
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

    const membership = await prisma.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId: parsedEventId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not assigned to this event." },
        { status: 403 },
      );
    }

    const photos = await prisma.photo.findMany({
      where: {
        eventId: parsedEventId,
        uploadedById: session.user.id,
      },
      select: {
        id: true,
        eventId: true,
        filename: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      photos,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load photos." },
      { status: 500 },
    );
  }
}