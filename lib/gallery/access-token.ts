import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_DURATION_SECONDS = 60 * 60;

function getSecret(): string {
  const secret = process.env.GALLERY_ACCESS_SECRET;

  if (!secret) {
    throw new Error("GALLERY_ACCESS_SECRET is not configured.");
  }

  return secret;
}

function createSignature(
  slug: string,
  expiresAt: number,
): string {
  return createHmac("sha256", getSecret())
    .update(`${slug}.${expiresAt}`)
    .digest("hex");
}

export function createGalleryAccessToken(
  slug: string,
): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) + TOKEN_DURATION_SECONDS;

  const signature = createSignature(slug, expiresAt);

  return `${slug}.${expiresAt}.${signature}`;
}

export function verifyGalleryAccessToken(
  token: string,
  expectedSlug: string,
): boolean {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [slug, expiresAtString, signature] = parts;

  if (slug !== expectedSlug) {
    return false;
  }

  const expiresAt = Number(expiresAtString);

  if (!Number.isInteger(expiresAt)) {
    return false;
  }

  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createSignature(
    slug,
    expiresAt,
  );

  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(
    expectedSignature,
    "utf8",
  );

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer,
  );
}