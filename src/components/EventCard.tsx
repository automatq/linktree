"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

type Attendee = {
  avatarUrl: string;
  avatarInitials: string;
  username: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  coverUrl: string;
  startsAt: string;
  endsAt: string | null;
  maxAttendees: number | null;
  going: number;
  interested: number;
  attendees: Attendee[];
  userRsvp: string | null;
};

function formatEventDate(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const day = days[start.getDay()];
  const month = months[start.getMonth()];
  const date = start.getDate();
  const hours = start.getHours();
  const mins = start.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;

  let result = `${day}, ${month} ${date} · ${h}:${mins} ${ampm}`;

  if (endsAt) {
    const end = new Date(endsAt);
    const endH = end.getHours() % 12 || 12;
    const endMins = end.getMinutes().toString().padStart(2, "0");
    const endAmpm = end.getHours() >= 12 ? "PM" : "AM";
    // Same day? Just show end time
    if (start.toDateString() === end.toDateString()) {
      result += ` – ${endH}:${endMins} ${endAmpm}`;
    } else {
      const endMonth = months[end.getMonth()];
      result += ` – ${endMonth} ${end.getDate()}, ${endH}:${endMins} ${endAmpm}`;
    }
  }

  return result;
}

function isLive(startsAt: string, endsAt: string | null): boolean {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 24 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

function isUpcoming(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now();
}

function EventItem({ event, username, accentColor }: { event: Event; username: string; accentColor?: string }) {
  const { isSignedIn } = useUser();
  const [going, setGoing] = useState(event.going);
  const [interested, setInterested] = useState(event.interested);
  const [userRsvp, setUserRsvp] = useState(event.userRsvp);
  const [attendees, setAttendees] = useState(event.attendees);
  const [submitting, setSubmitting] = useState(false);

  const live = isLive(event.startsAt, event.endsAt);
  const upcoming = isUpcoming(event.startsAt);
  const full = event.maxAttendees ? going >= event.maxAttendees : false;

  async function rsvp(status: "going" | "interested" | "cancel") {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, status }),
      });
      if (!res.ok) return;

      if (status === "cancel") {
        if (userRsvp === "going") setGoing((v) => Math.max(0, v - 1));
        if (userRsvp === "interested") setInterested((v) => Math.max(0, v - 1));
        setUserRsvp(null);
      } else {
        // Remove old RSVP count
        if (userRsvp === "going") setGoing((v) => Math.max(0, v - 1));
        if (userRsvp === "interested") setInterested((v) => Math.max(0, v - 1));
        // Add new
        if (status === "going") setGoing((v) => v + 1);
        if (status === "interested") setInterested((v) => v + 1);
        setUserRsvp(status);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden">
      {/* Cover image */}
      {event.coverUrl && (
        <div className="w-full h-32 bg-black/5 dark:bg-white/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Status badge + date */}
        <div className="flex items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live now
            </span>
          )}
          <span className="text-[11px] text-black/40 dark:text-white/40">
            {formatEventDate(event.startsAt, event.endsAt)}
          </span>
        </div>

        {/* Title + description */}
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white leading-snug">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-xs text-black/50 dark:text-white/50 mt-1 leading-relaxed line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/30 dark:text-white/30 shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[11px] text-black/40 dark:text-white/40 truncate">
              {event.location}
            </span>
          </div>
        )}

        {/* Attendees row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Attendee avatars */}
            {attendees.length > 0 && (
              <div className="flex -space-x-1.5">
                {attendees.map((a, i) => (
                  <div
                    key={a.username}
                    className="h-6 w-6 rounded-full border-2 border-white dark:border-black bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden"
                    style={{ zIndex: attendees.length - i }}
                  >
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[7px] font-bold text-black/30 dark:text-white/30">{a.avatarInitials || "?"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {going} going{interested > 0 ? ` · ${interested} interested` : ""}
              {event.maxAttendees ? ` · ${event.maxAttendees} max` : ""}
            </span>
          </div>
        </div>

        {/* RSVP buttons */}
        <div className="flex gap-2">
          {isSignedIn ? (
            <>
              {userRsvp === "going" ? (
                <button
                  onClick={() => rsvp("cancel")}
                  disabled={submitting}
                  className="h-8 flex-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: accentColor || "#000" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Going
                </button>
              ) : (
                <button
                  onClick={() => rsvp("going")}
                  disabled={submitting || (full && userRsvp !== "going")}
                  className="h-8 flex-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: accentColor || "#000" }}
                >
                  {full ? "Full" : "Going"}
                </button>
              )}
              {userRsvp === "interested" ? (
                <button
                  onClick={() => rsvp("cancel")}
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg border text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: accentColor || "rgba(0,0,0,0.15)", color: accentColor || undefined }}
                >
                  Interested ✓
                </button>
              ) : (
                <button
                  onClick={() => rsvp("interested")}
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg border border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 transition-all disabled:opacity-50"
                >
                  Interested
                </button>
              )}
            </>
          ) : (
            <Link
              href="/sign-in"
              className="h-8 flex-1 rounded-lg border border-black/10 dark:border-white/10 text-xs font-medium text-black/40 dark:text-white/40 flex items-center justify-center hover:text-black dark:hover:text-white transition-colors"
            >
              Sign in to RSVP
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventSection({
  username,
  accentColor,
}: {
  username: string;
  accentColor?: string;
}) {
  const [eventList, setEventList] = useState<Event[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${username}`)
      .then((r) => r.json())
      .then((d) => { setEventList(d.events || []); setLoaded(true); });
  }, [username]);

  if (!loaded || eventList.length === 0) return null;

  return (
    <section className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-3 py-1">
        <div className="flex items-center gap-2 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/30 dark:text-white/30">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
            Events
          </span>
        </div>
        <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
      </div>

      {eventList.map((event) => (
        <EventItem key={event.id} event={event} username={username} accentColor={accentColor} />
      ))}
    </section>
  );
}
