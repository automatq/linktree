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

// --- Team booking helpers ---

export type TeamMemberSlotInfo = {
  memberId: string;
  windows: AvailabilityWindow[];
  existing: ExistingBooking[];
  timezone: string;
};

export type TeamSlot = {
  startsAt: Date;
  availableMembers: string[]; // member IDs who can take this slot
};

/**
 * Generate merged available slots across all team members.
 * Returns the union of all members' available times, with metadata
 * about which members are free at each slot.
 */
export function generateTeamSlots(
  dateStr: string,
  members: TeamMemberSlotInfo[],
  durationMins: number,
  bufferMins: number,
): TeamSlot[] {
  // Generate slots per member using their own timezone + availability
  const slotMap = new Map<number, string[]>(); // timestamp → member IDs

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
        existing.push(member.memberId);
      } else {
        slotMap.set(ts, [member.memberId]);
      }
    }
  }

  // Convert to sorted array
  return Array.from(slotMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, memberIds]) => ({
      startsAt: new Date(ts),
      availableMembers: memberIds,
    }));
}

/**
 * Pick the best team member for a slot based on assignment strategy.
 */
export function pickTeamMember(
  availableMembers: string[],
  strategy: "least-busy" | "round-robin",
  bookingCounts: Map<string, number>, // memberId → confirmed booking count
): string {
  if (availableMembers.length === 1) return availableMembers[0];

  if (strategy === "least-busy") {
    // Pick the member with fewest confirmed bookings
    let bestId = availableMembers[0];
    let bestCount = bookingCounts.get(bestId) ?? 0;
    for (const id of availableMembers) {
      const count = bookingCounts.get(id) ?? 0;
      if (count < bestCount) {
        bestId = id;
        bestCount = count;
      }
    }
    return bestId;
  }

  // round-robin: same logic (fewest bookings = next in rotation)
  let bestId = availableMembers[0];
  let bestCount = bookingCounts.get(bestId) ?? 0;
  for (const id of availableMembers) {
    const count = bookingCounts.get(id) ?? 0;
    if (count < bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return bestId;
}
