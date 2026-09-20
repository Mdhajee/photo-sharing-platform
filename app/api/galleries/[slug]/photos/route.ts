import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import { prisma } from "@/lib/prisma";
import {
  s3Bucket,
  s3Client,
} from "@/lib/storage/s3";
import {
  verifyGalleryAccessToken,
} from "@/lib/gallery/access-token";

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

    const cookieStore = await cookies();
    
    const accessToken =
      cookieStore.get("gallery_access")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Gallery access is required." },
        { status: 401 },
      );
    }

    const validToken = verifyGalleryAccessToken(
      accessToken,
      slug,
    );

    if (!validToken) {
      return NextResponse.json(
        { error: "Gallery access has expired or is invalid." },
        { status: 401 },
      );
    }

    const gallery = await prisma.gallery.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        eventId: true,
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

    const photos = await prisma.photo.findMany({
      where: {
        eventId: gallery.eventId,
        selectedForGallery: true,
      },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        createdAt: true,
        storageLocation: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const command = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: photo.storageLocation,
        });

        const url = await getSignedUrl(
          s3Client,
          command,
          {
            expiresIn: 60 * 60,
          },
        );

        return {
          id: photo.id,
          filename: photo.filename,
          fileSize: photo.fileSize,
          createdAt: photo.createdAt,
          url,
        };
      }),
    );

    return NextResponse.json({
      photos: photosWithUrls,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load gallery photos." },
      { status: 500 },
    );
  }
}