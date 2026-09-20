import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return session;
}

export async function getSession(token: string) {
  const session = await prisma.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    return null;
  }

  return getSession(token);
}