"use client";

import { FormEvent, useEffect, useState } from "react";
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
  createdById: number;
};

type Photo = {
  id: number;
  eventId: number;
  uploadedById: number;
  filename: string;
  storageLocation: string;
  fileSize: number;
  selectedForGallery: boolean;
  createdAt: string;
  uploadedBy: {
    id: number;
    name: string;
    email: string;
  };
};

type Gallery = {
  id: number;
  eventId: number;
  slug: string;
  published: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [eventName, setEventName] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");

  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    null,
  );
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [assigningMember, setAssigningMember] = useState(false);

  const [error, setError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [success, setSuccess] = useState("");

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [galleryPin, setGalleryPin] = useState("");
  const [galleryCreating, setGalleryCreating] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [gallerySuccess, setGallerySuccess] = useState("");
  const [createdGalleryPin, setCreatedGalleryPin] = useState("");
  const [galleryPublishing, setGalleryPublishing] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const meResponse = await fetch("/api/auth/me");

        if (!meResponse.ok) {
          router.push("/login");
          return;
        }

        const meData = await meResponse.json();

        if (meData.user.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }

        setUser(meData.user);

        const [eventsResponse, membersResponse] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/users/team-members"),
        ]);

        if (!eventsResponse.ok) {
          throw new Error("Unable to load events.");
        }

        if (!membersResponse.ok) {
          throw new Error("Unable to load team members.");
        }

        const eventsData = await eventsResponse.json();
        const membersData = await membersResponse.json();

        setEvents(eventsData.events);
        setTeamMembers(membersData.teamMembers ?? []);
      } catch {
        setError("Unable to load admin data.");
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [router]);

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = eventName.trim();

    if (!trimmedName) {
      setError("Event name is required.");
      return;
    }

    setCreatingEvent(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create event.");
        return;
      }

      setEvents((currentEvents) => [data.event, ...currentEvents]);
      setEventName("");
      setSuccess("Event created successfully.");
    } catch {
      setError("Unable to create event.");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleCreateMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMemberError("");
    setSuccess("");

    const name = memberName.trim();
    const email = memberEmail.trim();

    if (!name || !email || !memberPassword) {
      setMemberError("Name, email, and password are required.");
      return;
    }

    if (memberPassword.length < 8) {
      setMemberError(
        "Team member password must be at least 8 characters.",
      );
      return;
    }

    setCreatingMember(true);

    try {
      const response = await fetch("/api/users/team-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password: memberPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMemberError(
          data.error || "Unable to create team member.",
        );
        return;
      }

      setTeamMembers((currentMembers) => [
        ...currentMembers,
        data.user,
      ]);

      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");

      setSuccess("Team member created successfully.");
    } catch {
      setMemberError("Unable to create team member.");
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleAssignMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setAssignmentError("");
    setSuccess("");

    if (!selectedEventId || !selectedTeamMemberId) {
      setAssignmentError(
        "Select both an event and a team member.",
      );
      return;
    }

    setAssigningMember(true);

    try {
      const response = await fetch(
        `/api/events/${selectedEventId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamMemberId: selectedTeamMemberId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setAssignmentError(
          data.error || "Unable to assign team member.",
        );
        return;
      }

      setSuccess("Team member assigned successfully.");

      setSelectedEventId(null);
      setSelectedTeamMemberId(null);
    } catch {
      setAssignmentError(
        "Unable to assign team member.",
      );
    } finally {
      setAssigningMember(false);
    }
  }

  async function loadGallery(eventId: number) {
  setGalleryLoading(true);
  setGalleryError("");
  setGallerySuccess("");
  setCreatedGalleryPin("");

  try {
    const response = await fetch(
      `/api/admin/events/${eventId}/gallery`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to load gallery.",
      );
    }

    setGallery(data.gallery ?? null);
  } catch (error) {
    setGallery(null);

    setGalleryError(
      error instanceof Error
        ? error.message
        : "Unable to load gallery.",
    );
  } finally {
    setGalleryLoading(false);
  }
}

async function handleCreateGallery() {
  if (selectedEventId === null) {
    setGalleryError("Please select an event first.");
    return;
  }

  const pin = galleryPin.trim();

  if (!/^\d{4,8}$/.test(pin)) {
    setGalleryError("Gallery PIN must contain 4 to 8 digits.");
    return;
  }

  setGalleryCreating(true);
  setGalleryError("");
  setGallerySuccess("");
  setCreatedGalleryPin("");

  try {
    const response = await fetch(
      `/api/admin/events/${selectedEventId}/gallery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setGalleryError(
        data.error || "Unable to create gallery.",
      );
      return;
    }

    setGallery(data.gallery);
    setCreatedGalleryPin(data.pin);
    setGalleryPin("");
    setGallerySuccess(
      "Gallery created successfully.",
    );
  } catch {
    setGalleryError("Unable to create gallery.");
  } finally {
    setGalleryCreating(false);
  }
}

async function handleGalleryPublish(published: boolean) {
  if (selectedEventId === null || gallery === null) {
    setGalleryError("No gallery is selected.");
    return;
  }

  setGalleryPublishing(true);
  setGalleryError("");
  setGallerySuccess("");

  try {
    const response = await fetch(
      `/api/admin/events/${selectedEventId}/gallery`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          published,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setGalleryError(
        data.error || "Unable to update gallery.",
      );
      return;
    }

    setGallery(data.gallery);

    setGallerySuccess(
      published
        ? "Gallery published successfully."
        : "Gallery unpublished successfully.",
    );
  } catch {
    setGalleryError("Unable to update gallery.");
  } finally {
    setGalleryPublishing(false);
  }
}

  async function loadPhotos(eventId: number) {
    setSelectedEventId(eventId);
    setPhotos([]);
    setPhotoError("");
    setSuccess("");
    setPhotosLoading(true);

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/photos`,
      );

      const data = await response.json();

      if (!response.ok) {
        setPhotoError(
          data.error || "Unable to load photos.",
        );
        return;
      }

      setPhotos(data.photos);
      await loadGallery(eventId);
    } catch {
      setPhotoError("Unable to load photos.");
    } finally {
      setPhotosLoading(false);
    }
  }

  async function handlePhotoSelection(
    photoId: number,
    selected: boolean,
  ) {
    setPhotoError("");
    setSuccess("");

    if (selectedEventId === null) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/events/${selectedEventId}/photos`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photoId,
            selected,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setPhotoError(
          data.error ||
            "Unable to update photo selection.",
        );
        return;
      }

      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                selectedForGallery:
                  data.photo.selectedForGallery,
              }
            : photo,
        ),
      );

      setSuccess(
        selected
          ? "Photo selected for gallery."
          : "Photo removed from gallery selection.",
      );
    } catch {
      setPhotoError(
        "Unable to update photo selection.",
      );
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

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Admin Dashboard
            </h1>

            {user && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Name: {user.name}</p>
                <p>Email: {user.email}</p>
                <p>Role: {user.role}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Logout
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded bg-green-100 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Create Event
          </h2>

          <form
            onSubmit={handleCreateEvent}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={eventName}
              onChange={(event) =>
                setEventName(event.target.value)
              }
              placeholder="Event name"
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />

            <button
              type="submit"
              disabled={creatingEvent}
              className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingEvent
                ? "Creating..."
                : "Create Event"}
            </button>
          </form>
        </section>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Create Team Member
          </h2>

          <form
            onSubmit={handleCreateMember}
            className="space-y-3"
          >
            <input
              type="text"
              value={memberName}
              onChange={(event) =>
                setMemberName(event.target.value)
              }
              placeholder="Team member name"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />

            <input
              type="email"
              value={memberEmail}
              onChange={(event) =>
                setMemberEmail(event.target.value)
              }
              placeholder="Team member email"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />

            <input
              type="password"
              value={memberPassword}
              onChange={(event) =>
                setMemberPassword(event.target.value)
              }
              placeholder="Temporary password"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />

            {memberError && (
              <p className="rounded bg-red-100 p-3 text-sm text-red-700">
                {memberError}
              </p>
            )}

            <button
              type="submit"
              disabled={creatingMember}
              className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingMember
                ? "Creating..."
                : "Create Team Member"}
            </button>
          </form>
        </section>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Team Members
          </h2>

          {teamMembers.length === 0 ? (
            <p className="text-gray-600">
              No team members created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                if (!member) return null;
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {member.role}
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Assign Team Member to Event
          </h2>

          <form
            onSubmit={handleAssignMember}
            className="space-y-4"
          >
            <select
              value={selectedEventId ?? ""}
              onChange={(event) =>
                setSelectedEventId(
                  event.target.value
                    ? Number(event.target.value)
                    : null,
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">
                Select event
              </option>

              {events.map((event) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTeamMemberId ?? ""}
              onChange={(event) =>
                setSelectedTeamMemberId(
                  event.target.value
                    ? Number(event.target.value)
                    : null,
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">
                Select team member
              </option>

              {teamMembers.map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.name} — {member.email}
                </option>
              ))}
            </select>

            {assignmentError && (
              <p className="rounded bg-red-100 p-3 text-sm text-red-700">
                {assignmentError}
              </p>
            )}

            <button
              type="submit"
              disabled={assigningMember}
              className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {assigningMember
                ? "Assigning..."
                : "Assign Team Member"}
            </button>
          </form>
        </section>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Events
          </h2>

          {events.length === 0 ? (
            <p className="text-gray-600">
              No events created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {event.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      Event ID: {event.id}
                    </p>
                  </div>

                  <button
                    onClick={() => loadPhotos(event.id)}
                    className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Review Photos
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedEventId !== null && (
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Photo Review
            </h2>

            {photosLoading && (
              <p>Loading photos...</p>
            )}

            {photoError && (
              <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
                {photoError}
              </div>
            )}

            {!photosLoading &&
              !photoError &&
              photos.length === 0 && (
                <p className="text-gray-600">
                  No photos have been uploaded for this
                  event yet.
                </p>
              )}

            {!photosLoading &&
              photos.length > 0 && (
                <div className="space-y-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="rounded border border-gray-200 p-4"
                    >
                      <div className="mb-3">
                        <p className="font-medium">
                          {photo.filename}
                        </p>

                        <p className="text-sm text-gray-500">
                          Uploaded by:{" "}
                          {photo.uploadedBy.name}
                        </p>

                        <p className="text-sm text-gray-500">
                          File size: {photo.fileSize} bytes
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-medium ${
                            photo.selectedForGallery
                              ? "text-green-700"
                              : "text-gray-600"
                          }`}
                        >
                          {photo.selectedForGallery
                            ? "Selected for gallery"
                            : "Not selected"}
                        </span>

                        <button
                          onClick={() =>
                            handlePhotoSelection(
                              photo.id,
                              !photo.selectedForGallery,
                            )
                          }
                          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          {photo.selectedForGallery
                            ? "Deselect"
                            : "Select"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        )}

        {selectedEventId !== null && (
          <section className="mt-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold">
              Gallery Management
            </h2>

            <p className="mb-6 text-sm text-gray-600">
              Create and manage the customer gallery for this event.
            </p>

            {galleryLoading && (
              <p className="text-sm text-gray-600">
                Loading gallery...
              </p>
            )}

            {galleryError && (
              <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
                {galleryError}
              </div>
            )}

            {gallerySuccess && (
              <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">
                {gallerySuccess}
              </div>
            )}

            {!galleryLoading && !gallery && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="gallery-pin"
                    className="mb-1 block text-sm font-medium"
                  >
                    Gallery PIN
                  </label>

                  <input
                    id="gallery-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={galleryPin}
                    onChange={(event) =>
                      setGalleryPin(
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                    placeholder="Enter 4–8 digit PIN"
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Customers will need this PIN to access the
                    published gallery.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateGallery}
                  disabled={galleryCreating}
                  className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {galleryCreating
                    ? "Creating..."
                    : "Create Gallery"}
                </button>
              </div>
            )}

            {!galleryLoading && gallery && (
              <div className="space-y-5">
                <div className="rounded border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Gallery Status
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        gallery.published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {gallery.published
                        ? "Published"
                        : "Unpublished"}
                    </span>
                  </div>
                </div>

                {createdGalleryPin && (
                  <div className="rounded bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">
                      Gallery PIN
                    </p>

                    <p className="mt-1 text-2xl font-bold tracking-widest text-green-900">
                      {createdGalleryPin}
                    </p>

                    <p className="mt-1 text-xs text-green-700">
                      Save this PIN. It is shown only after gallery
                      creation.
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-sm font-medium">
                    Gallery Link
                  </p>

                  <a
                    href={`/gallery/${gallery.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm text-blue-600 underline"
                  >
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/gallery/${gallery.slug}`
                      : `/gallery/${gallery.slug}`}
                  </a>
                </div>

                <p className="text-sm text-gray-600">
                  The gallery must be published before customers
                  can access it.
                </p>
                <div className="flex gap-3">
                  {!gallery.published ? (
                    <button
                      type="button"
                      onClick={() => handleGalleryPublish(true)}
                      disabled={galleryPublishing}
                      className="rounded bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {galleryPublishing
                        ? "Publishing..."
                        : "Publish Gallery"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGalleryPublish(false)}
                      disabled={galleryPublishing}
                      className="rounded bg-gray-700 px-5 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {galleryPublishing
                        ? "Unpublishing..."
                        : "Unpublish Gallery"}
                    </button>
                  )}
                </div>                
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
} 