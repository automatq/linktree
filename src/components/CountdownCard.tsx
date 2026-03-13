"use client";

import { useState, useEffect } from "react";

function getTimeLeft(end: Date) {
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export function CountdownCard({
  title,
  description,
  endDateStr,
  accentColor,
}: {
  title: string;
  description?: string;
  endDateStr: string;
  accentColor?: string;
}) {
  const [endDate] = useState(() => new Date(endDateStr));
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endDate));

  useEffect(() => {
    const parsed = new Date(endDateStr);
    const id = setInterval(() => setTimeLeft(getTimeLeft(parsed)), 1000);
    return () => clearInterval(id);
  }, [endDateStr]);

  const parts = timeLeft
    ? [
        ...(timeLeft.days > 0 ? [{ value: timeLeft.days, label: "days" }] : []),
        { value: timeLeft.hours, label: "hrs" },
        { value: timeLeft.minutes, label: "min" },
        { value: timeLeft.seconds, label: "sec" },
      ]
    : [];

  return (
    <div
      className="w-full rounded-xl border border-black/8 dark:border-white/8 p-5 flex flex-col items-center gap-3 text-center"
      style={accentColor ? { borderColor: `${accentColor}40` } : undefined}
    >
      {title && (
        <p className="text-sm font-semibold text-black dark:text-white">{title}</p>
      )}
      {timeLeft ? (
        <div className="flex items-end gap-4">
          {parts.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className="text-3xl font-bold tabular-nums leading-none text-black dark:text-white"
                style={accentColor ? { color: accentColor } : undefined}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30">
                {label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-black/40 dark:text-white/40 py-2">Ended</p>
      )}
      {description && (
        <p className="text-xs text-black/50 dark:text-white/50">{description}</p>
      )}
    </div>
  );
}
