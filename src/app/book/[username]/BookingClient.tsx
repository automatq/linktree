"use client";
import { useState, useEffect, useCallback } from "react";

type Step = "calendar" | "slots" | "form" | "confirmed";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

type BookingClientProps = {
  username: string;
  hostName: string;
  title: string;
  duration: number;
  accentColor?: string;
  isEmbed?: boolean;
  isInline?: boolean;
};

export function BookingClient({ username, hostName, title, duration, accentColor, isEmbed, isInline }: BookingClientProps) {
  const [step, setStep] = useState<Step>("calendar");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [hostTimezone, setHostTimezone] = useState("UTC");
  const [guestTimezone] = useState(() =>
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
  );

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const accent = accentColor || "#000000";

  // Load available dates
  useEffect(() => {
    fetch(`/api/booking/${username}/slots`)
      .then((r) => r.json())
      .then((d) => {
        setAvailableDates(d.dates || []);
        setHostTimezone(d.timezone || "UTC");
      })
      .catch(() => {});
  }, [username]);

  // Load slots for selected date
  const loadSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    try {
      const r = await fetch(`/api/booking/${username}/slots?date=${date}`);
      const d = await r.json();
      setSlots(d.slots || []);
    } finally {
      setLoadingSlots(false);
    }
  }, [username]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadSlots(date);
    setStep("slots");
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/booking/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotISO: selectedSlot,
          guestName,
          guestEmail,
          guestPhone,
          notes,
          guestTimezone,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setBookingId(d.id);
        setStep("confirmed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Build calendar grid
  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toLocaleDateString("sv-SE");

  const availSet = new Set(availableDates);

  function formatSlotLocal(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      timeZone: guestTimezone,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatSlotEnd(iso: string) {
    const d = new Date(new Date(iso).getTime() + duration * 60 * 1000);
    return d.toLocaleTimeString("en-US", {
      timeZone: guestTimezone,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatSelectedDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const inputClass = "w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors";

  return (
    <div className={isInline ? "w-full py-2" : "min-h-screen bg-white dark:bg-black flex items-start justify-center px-4 py-12"}>
      <div className="w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3"
            style={{ background: accent + "20" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-black dark:text-white">{title}</h1>
          <p className="text-sm text-black/40 dark:text-white/40 mt-0.5">{hostName} · {duration} min</p>
        </div>

        {/* Step: Calendar */}
        {step === "calendar" && (
          <div className="rounded-xl border border-black/8 dark:border-white/8 p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalendarMonth((m) => {
                  const d = new Date(m.year, m.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="flex h-7 w-7 items-center justify-center rounded-md text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-semibold text-black dark:text-white">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={() => setCalendarMonth((m) => {
                  const d = new Date(m.year, m.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="flex h-7 w-7 items-center justify-center rounded-md text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-black/30 dark:text-white/30 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isAvailable = availSet.has(dateStr);
                const isPast = dateStr <= today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={day}
                    disabled={!isAvailable || isPast}
                    onClick={() => handleDateSelect(dateStr)}
                    className={`relative flex h-8 w-full items-center justify-center rounded-lg text-sm transition-all ${
                      isSelected
                        ? "text-white font-semibold"
                        : isAvailable && !isPast
                          ? "text-black dark:text-white hover:text-white font-medium"
                          : "text-black/20 dark:text-white/20 cursor-not-allowed"
                    }`}
                    style={
                      isSelected
                        ? { background: accent }
                        : isAvailable && !isPast
                          ? undefined
                          : undefined
                    }
                    onMouseEnter={(e) => {
                      if (isAvailable && !isPast && !isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.background = accent + "cc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.background = "";
                      }
                    }}
                  >
                    {day}
                    {isAvailable && !isPast && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                        style={{ background: isSelected ? "white" : accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] text-black/25 dark:text-white/25">
              Times shown in {guestTimezone.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Step: Slots */}
        {step === "slots" && selectedDate && (
          <div>
            <button
              onClick={() => setStep("calendar")}
              className="mb-4 flex items-center gap-1.5 text-sm text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>

            <p className="mb-1 font-semibold text-black dark:text-white">{formatSelectedDate(selectedDate)}</p>
            <p className="mb-5 text-sm text-black/40 dark:text-white/40">{duration} min · Select a time</p>

            {loadingSlots ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center py-8 text-sm text-black/30 dark:text-white/30">No available times on this day.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleSlotSelect(slot)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      accentColor
                        ? ""
                        : "border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white"
                    }`}
                    style={accentColor ? {
                      borderColor: accent + "40",
                      color: accent,
                    } : undefined}
                    onMouseEnter={accentColor ? (e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = accent;
                      (e.currentTarget as HTMLButtonElement).style.color = "white";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = accent;
                    } : undefined}
                    onMouseLeave={accentColor ? (e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "";
                      (e.currentTarget as HTMLButtonElement).style.color = accent;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "40";
                    } : undefined}
                  >
                    {formatSlotLocal(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && selectedDate && selectedSlot && (
          <div>
            <button
              onClick={() => setStep("slots")}
              className="mb-4 flex items-center gap-1.5 text-sm text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>

            {/* Slot summary */}
            <div
              className={`rounded-xl p-4 mb-5 ${accentColor ? "" : "bg-black/5 dark:bg-white/5"}`}
              style={accentColor ? { background: accent + "12" } : undefined}
            >
              <p className={`font-semibold text-sm ${accentColor ? "" : "text-black dark:text-white"}`} style={accentColor ? { color: accent } : undefined}>{title}</p>
              <p className={`text-sm mt-0.5 ${accentColor ? "" : "text-black/60 dark:text-white/60"}`} style={accentColor ? { color: accent + "cc" } : undefined}>
                {formatSelectedDate(selectedDate)} · {formatSlotLocal(selectedSlot)} – {formatSlotEnd(selectedSlot)}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1">Your name</label>
                <input
                  className={inputClass}
                  placeholder="Jane Smith"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1">Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="jane@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1">
                  Phone <span className="text-black/25 dark:text-white/25 font-normal">(optional — for SMS reminders)</span>
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+1 555 000 0000"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1">
                  Notes <span className="text-black/25 dark:text-white/25 font-normal">(optional)</span>
                </label>
                <textarea
                  className={inputClass + " resize-none"}
                  rows={3}
                  placeholder="Anything you'd like to discuss..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={`mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 ${accentColor ? "text-white" : "bg-black dark:bg-white text-white dark:text-black"}`}
                style={accentColor ? { background: accent } : undefined}
              >
                {submitting ? "Confirming…" : "Confirm booking"}
              </button>
            </form>
          </div>
        )}

        {/* Step: Confirmed */}
        {step === "confirmed" && selectedSlot && (
          <div className="text-center">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full mb-4 ${accentColor ? "" : "bg-black/10 dark:bg-white/10"}`}
              style={accentColor ? { background: accent + "20" } : undefined}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor ? accent : "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-white mb-1">You&apos;re booked!</h2>
            <p className="text-sm text-black/40 dark:text-white/40 mb-6">A confirmation has been sent to {guestEmail}.</p>

            <div
              className={`rounded-xl p-4 text-left mb-6 ${accentColor ? "" : "bg-black/5 dark:bg-white/5"}`}
              style={accentColor ? { background: accent + "10" } : undefined}
            >
              <p className={`font-semibold text-sm ${accentColor ? "" : "text-black dark:text-white"}`} style={accentColor ? { color: accent } : undefined}>{title} with {hostName}</p>
              <p className={`text-sm mt-1 ${accentColor ? "" : "text-black/60 dark:text-white/60"}`} style={accentColor ? { color: accent + "bb" } : undefined}>
                {selectedDate && formatSelectedDate(selectedDate)}
              </p>
              <p className={`text-sm ${accentColor ? "" : "text-black/60 dark:text-white/60"}`} style={accentColor ? { color: accent + "bb" } : undefined}>
                {formatSlotLocal(selectedSlot)} – {formatSlotEnd(selectedSlot)}
              </p>
            </div>

            {!isEmbed && (
              <a
                href={`/${username}`}
                className="text-sm text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
              >
                ← Back to profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
