import { describe, expect, it } from "vitest";
import {
  createGalleryAccessToken,
  verifyGalleryAccessToken,
} from "@/lib/gallery/access-token";

describe("Gallery access token security", () => {
  it("creates a token that can be verified for the correct gallery", () => {
    process.env.GALLERY_ACCESS_SECRET = "test-gallery-secret";

    const token = createGalleryAccessToken("test-gallery");

    expect(
      verifyGalleryAccessToken(token, "test-gallery"),
    ).toBe(true);
  });

  it("rejects a token for a different gallery", () => {
    process.env.GALLERY_ACCESS_SECRET = "test-gallery-secret";

    const token = createGalleryAccessToken("test-gallery");

    expect(
      verifyGalleryAccessToken(token, "another-gallery"),
    ).toBe(false);
  });

  it("rejects a malformed token", () => {
    process.env.GALLERY_ACCESS_SECRET = "test-gallery-secret";

    expect(
      verifyGalleryAccessToken("invalid-token", "test-gallery"),
    ).toBe(false);
  });

  it("rejects a token with a modified signature", () => {
    process.env.GALLERY_ACCESS_SECRET = "test-gallery-secret";

    const token = createGalleryAccessToken("test-gallery");
    const parts = token.split(".");

    parts[2] = "invalid-signature";

    expect(
      verifyGalleryAccessToken(parts.join("."), "test-gallery"),
    ).toBe(false);
  });
});
