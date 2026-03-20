"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ReactionBar, useReactions } from "@/components/ReactionBar";

type WallNote = {
  id: string;
  message: string;
  color: string;
  rotation: number;
  createdAt: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  authorAvatarInitials: string;
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
  yellow: { bg: "bg-amber-100 dark:bg-amber-200", border: "border-amber-200 dark:border-amber-300", text: "text-amber-900", shadow: "shadow-amber-200/40" },
  blue:   { bg: "bg-sky-100 dark:bg-sky-200",     border: "border-sky-200 dark:border-sky-300",     text: "text-sky-900",   shadow: "shadow-sky-200/40" },
  green:  { bg: "bg-emerald-100 dark:bg-emerald-200", border: "border-emerald-200 dark:border-emerald-300", text: "text-emerald-900", shadow: "shadow-emerald-200/40" },
  pink:   { bg: "bg-pink-100 dark:bg-pink-200",   border: "border-pink-200 dark:border-pink-300",   text: "text-pink-900",  shadow: "shadow-pink-200/40" },
  purple: { bg: "bg-violet-100 dark:bg-violet-200", border: "border-violet-200 dark:border-violet-300", text: "text-violet-900", shadow: "shadow-violet-200/40" },
};

const COLORS = ["yellow", "blue", "green", "pink", "purple"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function WallCanvas({
  username,
  title,
  accentColor,
}: {
  username: string;
  title: string;
  accentColor?: string;
}) {
  const { isSignedIn } = useUser();
  const [notes, setNotes] = useState<WallNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [justPosted, setJustPosted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/wall/${username}`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes || []));
  }, [username]);

  const reactionData = useReactions(username, "wall_note", notes.map((n) => n.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/wall/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, color: selectedColor }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong"); return; }
      setNotes((prev) => [d.note, ...prev]);
      setMessage("");
      setShowForm(false);
      setJustPosted(true);
      setTimeout(() => setJustPosted(false), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="w-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
            {title}
          </span>
          <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
        </div>
        {!showForm && !justPosted && (
          isSignedIn ? (
            <button
              onClick={() => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100); }}
              className="shrink-0 ml-3 h-7 px-3 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
              style={accentColor ? { backgroundColor: accentColor + "18", color: accentColor } : undefined}
            >
              + Leave a note
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="shrink-0 ml-3 h-7 px-3 rounded-lg text-[11px] font-medium text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10 flex items-center hover:text-black dark:hover:text-white transition-colors"
            >
              Sign in to post
            </Link>
          )
        )}
        {justPosted && (
          <span className="shrink-0 ml-3 text-[11px] text-emerald-500 font-medium">Posted!</span>
        )}
      </div>

      {/* Post form */}
      {showForm && (
        <div
          ref={formRef}
          className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-3"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              placeholder="Write something on the wall..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={120}
              rows={2}
              required
              autoFocus
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none"
            />
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-black/30 dark:text-white/30 uppercase tracking-wider">Color</span>
              <div className="flex gap-1.5">
                {COLORS.map((c) => {
                  const cm = COLOR_MAP[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`h-6 w-6 rounded-full ${cm.bg} border-2 transition-all ${
                        selectedColor === c ? "border-black/40 dark:border-white/40 scale-110" : "border-transparent"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="h-8 flex-1 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: accentColor || "#000" }}
              >
                {sending ? "Posting…" : "Post to wall"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="h-8 px-4 rounded-lg border border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes grid */}
      {notes.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 py-10 flex flex-col items-center gap-2">
          <p className="text-sm text-black/30 dark:text-white/30">No notes yet</p>
          <p className="text-xs text-black/20 dark:text-white/20">Be the first to leave a note</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {notes.map((note, i) => {
            const cm = COLOR_MAP[note.color] || COLOR_MAP.yellow;
            return (
              <div
                key={note.id}
                className={`${cm.bg} ${cm.border} ${cm.text} border rounded-lg p-3 flex flex-col gap-1.5 shadow-sm ${cm.shadow} transition-transform hover:scale-[1.02] hover:shadow-md`}
                style={{
                  transform: `rotate(${note.rotation}deg)`,
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <p className="text-[13px] leading-snug break-words whitespace-pre-wrap">
                  {note.message}
                </p>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <Link
                    href={`/${note.authorUsername}`}
                    title={`@${note.authorUsername}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-5 w-5 rounded-full bg-black/10 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-black/20 transition-all">
                      {note.authorAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={note.authorAvatarUrl} alt={`@${note.authorUsername}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[7px] font-bold opacity-50">{note.authorAvatarInitials || "?"}</span>
                      )}
                    </div>
                  </Link>
                  <span className="text-[9px] opacity-40 shrink-0">
                    {timeAgo(note.createdAt)}
                  </span>
                </div>
                <ReactionBar
                  username={username}
                  targetType="wall_note"
                  targetId={note.id}
                  initialData={reactionData[note.id]}
                  accentColor={accentColor}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
