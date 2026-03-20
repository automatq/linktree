"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

const EMOJIS = ["❤️", "🔥", "👏", "😂", "😮", "💯"];

type ReactionData = {
  counts: Record<string, number>;
  userEmojis: string[];
};

/**
 * Reusable reaction bar — shows emoji counts and lets signed-in users toggle reactions.
 * Use `useReactions()` hook to batch-load reaction data for multiple items.
 */
export function ReactionBar({
  username,
  targetType,
  targetId,
  initialData,
  accentColor,
}: {
  username: string;
  targetType: string;
  targetId: string;
  initialData?: ReactionData;
  accentColor?: string;
}) {
  const { isSignedIn } = useUser();
  const [counts, setCounts] = useState<Record<string, number>>(initialData?.counts ?? {});
  const [userEmojis, setUserEmojis] = useState<string[]>(initialData?.userEmojis ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [toggling, setToggling] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Update when initialData changes (loaded async)
  useEffect(() => {
    if (initialData) {
      setCounts(initialData.counts);
      setUserEmojis(initialData.userEmojis);
    }
  }, [initialData]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  async function toggleReaction(emoji: string) {
    if (toggling || !isSignedIn) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/reactions/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, emoji }),
      });
      const d = await res.json();
      if (!res.ok) return;

      if (d.action === "added") {
        setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
        setUserEmojis((prev) => [...prev, emoji]);
      } else if (d.action === "removed") {
        setCounts((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 1) - 1) }));
        setUserEmojis((prev) => prev.filter((e) => e !== emoji));
      }
    } finally {
      setToggling(false);
      setShowPicker(false);
    }
  }

  // Active reactions (have at least 1 count)
  const activeEmojis = Object.entries(counts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex items-center gap-1 flex-wrap relative">
      {/* Show existing reactions */}
      {activeEmojis.map(([emoji, count]) => {
        const isUserReaction = userEmojis.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => isSignedIn && toggleReaction(emoji)}
            disabled={toggling || !isSignedIn}
            className={`inline-flex items-center gap-1 h-6 px-1.5 rounded-full text-[11px] transition-all ${
              isUserReaction
                ? "bg-black/8 dark:bg-white/8"
                : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/8 dark:hover:bg-white/8"
            } disabled:cursor-default`}
            style={isUserReaction ? { boxShadow: `inset 0 0 0 1px ${accentColor || "rgba(0,0,0,0.2)"}` } : undefined}
          >
            <span className="text-xs leading-none">{emoji}</span>
            <span className="text-[10px] tabular-nums text-black/50 dark:text-white/50">{count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      {isSignedIn && (
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/8 dark:hover:bg-white/8 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {/* Emoji picker */}
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg z-10">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  disabled={toggling}
                  className="h-7 w-7 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-sm transition-colors disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to batch-load reactions for multiple targets.
 * Returns a map of targetId -> ReactionData.
 */
export function useReactions(
  username: string,
  targetType: string,
  targetIds: string[],
): Record<string, ReactionData> {
  const [data, setData] = useState<Record<string, ReactionData>>({});
  const idsKey = targetIds.sort().join(",");

  useEffect(() => {
    if (!targetIds.length || !username) return;
    fetch(`/api/reactions/${username}?type=${targetType}&ids=${targetIds.join(",")}`)
      .then((r) => r.json())
      .then((d) => setData(d.reactions || {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, targetType, idsKey]);

  return data;
}
