/**
 * Converts a wall-clock datetime in a named timezone to a UTC Date.
 * e.g. wallToUTC("2024-06-10", "09:00", "America/New_York") → UTC Date
 */
export function wallToUTC(dateStr: string, timeStr: string, tz: string): Date {
  // Start with the assumption that our input is UTC, then correct for the offset
  const approx = new Date(`${dateStr}T${timeStr}:00Z`);
  // Find what the approx UTC instant looks like in the target timezone
  const wallInTz = approx.toLocaleString("sv-SE", { timeZone: tz }); // "YYYY-MM-DD HH:MM:SS"
  const wallAsUTC = new Date(wallInTz.replace(" ", "T") + "Z");
  const offsetMs = approx.getTime() - wallAsUTC.getTime();
  return new Date(approx.getTime() + offsetMs);
}

/**
 * Formats a UTC Date as a wall-clock string in a named timezone.
 * Returns "HH:MM" in 24h format.
 */
export function utcToWallTime(utcDate: Date, tz: string): string {
  return utcDate.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns "YYYY-MM-DD" for a UTC Date in the given timezone.
 */
export function utcToLocalDate(utcDate: Date, tz: string): string {
  return utcDate.toLocaleDateString("sv-SE", { timeZone: tz }); // "YYYY-MM-DD"
}

export type AvailabilityWindow = {
  dayOfWeek: number; // 0=Sun…6=Sat
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
};

export type ExistingBooking = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Generate available UTC slot start times for a given calendar date (in host's timezone).
 * Returns an array of UTC Date objects representing slot starts.
 */
export function generateSlots(
  dateStr: string, // "YYYY-MM-DD" as seen in host's timezone
  windows: AvailabilityWindow[],
  existing: ExistingBooking[],
  durationMins: number,
  bufferMins: number,
  hostTz: string
): Date[] {
  // Find the day of week for this date in the host's timezone
  const refDate = new Date(`${dateStr}T12:00:00Z`); // noon UTC to avoid date-boundary issues
  const dayOfWeek = parseInt(
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Sun" ? "0" :
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Mon" ? "1" :
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Tue" ? "2" :
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Wed" ? "3" :
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Thu" ? "4" :
    refDate.toLocaleDateString("en-US", { timeZone: hostTz, weekday: "short" }) === "Fri" ? "5" : "6"
  );

  const matchingWindows = windows.filter((w) => w.dayOfWeek === dayOfWeek);
  if (matchingWindows.length === 0) return [];

  const slots: Date[] = [];
  const nowMs = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  for (const win of matchingWindows) {
    const winStart = wallToUTC(dateStr, win.startTime, hostTz);
    const winEnd = wallToUTC(dateStr, win.endTime, hostTz);

    let cursor = winStart.getTime();
    const slotMs = durationMins * 60 * 1000;
    const bufferMs = bufferMins * 60 * 1000;

    while (cursor + slotMs <= winEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + slotMs;

      // Must be at least 1 hour in the future
      if (slotStart > nowMs + oneHourMs) {
        // Must not overlap with an existing booking (+ buffer)
        const conflicts = existing.some((b) => {
          const bStart = b.startsAt.getTime();
          const bEnd = b.endsAt.getTime() + bufferMs;
          return slotStart < bEnd && slotEnd > bStart;
        });

        if (!conflicts) {
          slots.push(new Date(slotStart));
        }
      }

      cursor += slotMs + bufferMs;
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Get the day of week (0=Sun…6=Sat) for a "YYYY-MM-DD" date in a given timezone.
 */
export function getDayOfWeek(dateStr: string, tz: string): number {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(`${dateStr}T12:00:00Z`);
  const label = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
  return days.indexOf(label);
}

// --- Group-based shared calendar helpers ---

export type GroupMemberSlotInfo = {
  profileId: number;
  windows: AvailabilityWindow[];
  existing: ExistingBooking[];
  timezone: string;
};

export type GroupSlot = {
  startsAt: Date;
  availableProfileIds: number[]; // profile IDs of members who can take this slot
};

/**
 * Generate merged available slots across all group members.
 * Returns the union of all members' available times, with metadata
 * about which members are free at each slot.
 */
export function generateGroupSlots(
  dateStr: string,
  members: GroupMemberSlotInfo[],
  durationMins: number,
  bufferMins: number,
): GroupSlot[] {
  const slotMap = new Map<number, number[]>(); // timestamp → profile IDs

  for (const member of members) {
    const memberSlots = generateSlots(
      dateStr,
      member.windows,
      member.existing,
      durationMins,
      bufferMins,
      member.timezone,
    );

    for (const slot of memberSlots) {
      const ts = slot.getTime();
      const existing = slotMap.get(ts);
      if (existing) {
        existing.push(member.profileId);
      } else {
        slotMap.set(ts, [member.profileId]);
      }
    }
  }

  return Array.from(slotMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, profileIds]) => ({
      startsAt: new Date(ts),
      availableProfileIds: profileIds,
    }));
}

/**
 * Pick the best group member for a slot based on assignment strategy.
 */
export function pickGroupMember(
  availableProfileIds: number[],
  strategy: "least-busy" | "round-robin",
  bookingCounts: Map<number, number>, // profileId → confirmed booking count
): number {
  if (availableProfileIds.length === 1) return availableProfileIds[0];

  // Both strategies use fewest-bookings (round-robin = natural rotation via count)
  let bestId = availableProfileIds[0];
  let bestCount = bookingCounts.get(bestId) ?? 0;
  for (const id of availableProfileIds) {
    const count = bookingCounts.get(id) ?? 0;
    if (count < bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return bestId;
}
