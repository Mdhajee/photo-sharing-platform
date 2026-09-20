"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
};

type Event = {
  id: number;
  name: string;
  createdAt: string;
};

type Photo = {
  id: number;
  eventId: number;
  filename: string;
  fileSize: number;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    null,
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const userResponse = await fetch("/api/auth/me");

        if (!userResponse.ok) {
          router.push("/login");
          return;
        }

        const userData = await userResponse.json();
        setUser(userData.user);

        if (userData.user.role === "ADMIN") {
          setLoading(false);
          return;
        }

        const eventsResponse = await fetch("/api/team/events");

        if (!eventsResponse.ok) {
          setError("Unable to load assigned events.");
          setLoading(false);
          return;
        }

        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events);
      } catch {
        setError("Unable to load the dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function loadPhotos(eventId: number) {
    setPhotosLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/team/events/${eventId}/photos`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to load photos.");
        return;
      }

      setPhotos(data.photos);
    } catch {
      setError("Unable to load photos.");
    } finally {
      setPhotosLoading(false);
    }
  }

  function handleEventSelect(eventId: number) {
    setSelectedEventId(eventId);
    setFiles([]);
    setSuccess("");
    loadPhotos(eventId);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setFiles(Array.from(event.target.files ?? []));
    setSuccess("");
    setError("");
  }

  async function handleUpload() {
    if (!selectedEventId) {
      setError("Select an event first.");
      return;
    }

    if (files.length === 0) {
      setError("Select at least one photo.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      for (const file of files) {
        formData.append("photos", file);
      }

      const response = await fetch(
        `/api/team/events/${selectedEventId}/photos`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to upload photos.");
        return;
      }

      setFiles([]);
      setSuccess(
        `${data.photos.length} photo${
          data.photos.length === 1 ? "" : "s"
        } uploaded successfully.`,
      );

      await loadPhotos(selectedEventId);
    } catch {
      setError("Unable to upload photos.");
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "TEAM_MEMBER") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="mt-2 text-gray-600">
          You do not have permission to access this dashboard.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold">
            Team Member Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-gray-500">
            {user.email}
          </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Logout
          </button> 
        </header>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Assigned Events
          </h2>

          {events.length === 0 ? (
            <p className="mt-4 text-gray-600">
              No events have been assigned to you.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventSelect(event.id)}
                  className={`block w-full rounded-md border p-4 text-left ${
                    selectedEventId === event.id
                      ? "border-black"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold">{event.name}</p>

                  <p className="mt-1 text-sm text-gray-500">
                    Event ID: {event.id}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedEventId && (
          <section className="mt-8 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">
              Upload Photos
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Select one or more photos for the selected event.
            </p>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="mt-5 block w-full"
            />

            {files.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {files.length} photo
                {files.length === 1 ? "" : "s"} selected.
              </p>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="mt-4 rounded-md bg-black px-5 py-2 text-white disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Photos"}
            </button>

            {error && (
              <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
                {success}
              </p>
            )}
          </section>
        )}

        {selectedEventId && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">
              My Uploaded Photos
            </h2>

            {photosLoading ? (
              <p className="mt-4 text-gray-600">
                Loading photos...
              </p>
            ) : photos.length === 0 ? (
              <div className="mt-4 rounded-lg bg-white p-6 shadow">
                <p className="text-gray-600">
                  You haven't uploaded any photos to this event yet.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-lg bg-white p-4 shadow"
                  >
                    <p className="font-medium">
                      {photo.filename}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Size: {photo.fileSize} bytes
                    </p>

                    <p className="text-sm text-gray-500">
                      Uploaded:{" "}
                      {new Date(
                        photo.createdAt,
                      ).toLocaleString()}
                    </p>
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