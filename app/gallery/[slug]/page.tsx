"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Gallery = {
  id: number;
  eventId: number;
  slug: string;
  eventName: string;
  published: boolean;
  publishedAt: string | null;
};

type Photo = {
  id: number;
  filename: string;
  fileSize: number;
  createdAt: string;
  url: string;
};

type GalleryResponse = {
  gallery: Gallery;
};

type PhotosResponse = {
  photos: Photo[];
};

type ApiError = {
  error: string;
};

export default function GalleryPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [pin, setPin] = useState("");
  const [verified, setVerified] = useState(false);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);

  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");

  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  useEffect(() => {
    async function loadGallery() {
      try {
        const response = await fetch(
          `/api/galleries/${slug}`,
        );

        const data: GalleryResponse | ApiError =
          await response.json();

        if (!response.ok) {
          if ("error" in data) {
           throw new Error(data.error);
          }

          throw new Error("Unable to load gallery.");
        }

        if (!("gallery" in data)) {
          throw new Error("Invalid gallery response.");
        }


        setGallery(data.gallery);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load gallery.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadGallery();
    } else {
      setError("Invalid gallery link.");
      setLoading(false);
    }
  }, [slug]);

  async function loadPhotos() {
    setPhotosLoading(true);
    setPhotoError("");

    try {
      const response = await fetch(
        `/api/galleries/${slug}/photos`,
      );

      const data: PhotosResponse | ApiError =
        await response.json();

      if (!response.ok) {
        if ("error" in data) {
          throw new Error(data.error);
        }

        throw new Error("Unable to load gallery photos.");
      }

      if (!("photos" in data)) {
        throw new Error("Invalid gallery photos response.");
      }

      setPhotos(data.photos);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Unable to load gallery photos.",
      );
    } finally {
      setPhotosLoading(false);
    }
  }

  async function handleVerifyPin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setPhotoError("");

    const trimmedPin = pin.trim();

    if (!/^\d{4,8}$/.test(trimmedPin)) {
      setError("Please enter a valid gallery PIN.");
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch(
        `/api/galleries/${slug}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin: trimmedPin,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to verify PIN.",
        );
        return;
      }

      setVerified(true);
      await loadPhotos();
    } catch {
      setError("Unable to verify PIN.");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p>Loading gallery...</p>
      </main>
    );
  }

  if (error && !gallery) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow">
          <h1 className="mb-3 text-2xl font-bold">
            Gallery Unavailable
          </h1>

          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!gallery) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            {gallery.eventName}
          </h1>

          <p className="mt-2 text-gray-600">
            Photo Gallery
          </p>
        </header>

        {!verified ? (
          <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold">
              Enter Gallery PIN
            </h2>

            <p className="mb-6 text-sm text-gray-600">
              Enter the PIN provided with your gallery link
              to view the photos.
            </p>

            <form
              onSubmit={handleVerifyPin}
              className="space-y-4"
            >
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value)
                }
                placeholder="Gallery PIN"
                maxLength={8}
                className="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg tracking-widest"
              />

              {error && (
                <p className="rounded bg-red-100 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {verifying
                  ? "Verifying..."
                  : "Access Gallery"}
              </button>
            </form>
          </section>
        ) : (
          <section>
            {photosLoading && (
              <p className="text-center text-gray-600">
                Loading photos...
              </p>
            )}

            {photoError && (
              <div className="mx-auto mb-6 max-w-md rounded bg-red-100 p-3 text-sm text-red-700">
                {photoError}
              </div>
            )}

            {!photosLoading &&
              !photoError &&
              photos.length === 0 && (
                <div className="rounded-lg bg-white p-6 text-center shadow">
                  <p className="text-gray-600">
                    No photos are currently available.
                  </p>
                </div>
              )}

            {!photosLoading &&
              photos.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-lg bg-white shadow"
                    >
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="h-auto w-full object-cover"
                      />

                      <div className="p-3">
                        <p className="truncate text-sm font-medium">
                          {photo.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        )}
      </div>
    </main>
  );
}