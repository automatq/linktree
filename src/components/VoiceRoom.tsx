"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

type VoiceNote = {
  id: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  authorAvatarInitials: string;
};

type Room = {
  id: string;
  prompt: string;
  notes: VoiceNote[];
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

// ── Audio Player ────────────────────────────────────────────────────────────

function AudioPlayer({ note, accentColor }: { note: VoiceNote; accentColor?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onTime = () => {
      if (el.duration) setProgress(el.currentTime / el.duration);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
      <audio ref={audioRef} src={note.audioUrl} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={toggle}
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ backgroundColor: accentColor || "#000", color: "#fff" }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        )}
      </button>

      {/* Progress + info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Link href={`/${note.authorUsername}`} className="flex items-center gap-1.5 min-w-0 group">
            <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
              {note.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={note.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[7px] font-bold text-black/30 dark:text-white/30">{note.authorAvatarInitials || "?"}</span>
              )}
            </div>
            <span className="text-xs font-medium text-black dark:text-white truncate group-hover:underline">
              @{note.authorUsername}
            </span>
          </Link>
          <span className="text-[10px] text-black/30 dark:text-white/30 shrink-0 ml-2">
            {timeAgo(note.createdAt)}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-black/8 dark:bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: accentColor || "#000",
            }}
          />
        </div>
        <span className="text-[10px] text-black/30 dark:text-white/30">
          {formatDuration(note.duration)}
        </span>
      </div>
    </div>
  );
}

// ── Voice Recorder ──────────────────────────────────────────────────────────

function VoiceRecorder({
  roomId,
  username,
  accentColor,
  onRecorded,
  onCancel,
}: {
  roomId: string;
  username: string;
  accentColor?: string;
  onRecorded: (note: VoiceNote) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const stream = useRef<MediaStream | null>(null);

  const MAX_DURATION = 90;

  async function startRecording() {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const recorder = new MediaRecorder(s, { mimeType: "audio/webm" });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        s.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_DURATION - 1) {
            recorder.stop();
            setRecording(false);
            clearInterval(timer.current);
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    clearInterval(timer.current);
  }

  function discardRecording() {
    setAudioBlob(null);
    setElapsed(0);
  }

  async function upload() {
    if (!audioBlob) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "voice-note.webm");
      form.append("roomId", roomId);
      form.append("duration", String(elapsed));

      const res = await fetch(`/api/voice/${username}`, { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to upload"); return; }
      onRecorded(d.note);
    } catch {
      setError("Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-3">
      {/* Recording controls */}
      {!audioBlob ? (
        <div className="flex items-center gap-3">
          {recording ? (
            <>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-mono text-black dark:text-white tabular-nums">
                  {formatDuration(elapsed)}
                </span>
                <span className="text-[10px] text-black/30 dark:text-white/30">/ {formatDuration(MAX_DURATION)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="ml-auto h-8 px-4 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              className="h-9 w-full rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor || "#000" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Record voice note
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-black dark:text-white">{formatDuration(elapsed)}</span>
            <span className="text-xs text-emerald-500 font-medium">Ready to post</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={upload}
              disabled={uploading}
              className="h-8 flex-1 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: accentColor || "#000" }}
            >
              {uploading ? "Uploading…" : "Post voice note"}
            </button>
            <button
              onClick={discardRecording}
              className="h-8 px-3 rounded-lg border border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={onCancel}
        className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors self-center"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Main VoiceRooms Component ───────────────────────────────────────────────

export function VoiceRooms({
  username,
  accentColor,
}: {
  username: string;
  accentColor?: string;
}) {
  const { isSignedIn } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recordingRoom, setRecordingRoom] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/voice/${username}`)
      .then((r) => r.json())
      .then((d) => { setRooms(d.rooms || []); setLoaded(true); });
  }, [username]);

  if (!loaded || rooms.length === 0) return null;

  return (
    <>
      {rooms.map((room) => (
        <section key={room.id} className="w-full flex flex-col gap-2.5">
          {/* Room header */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-2 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/30 dark:text-white/30">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
                Voice Room
              </span>
            </div>
            <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
          </div>

          {/* Prompt */}
          <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-black dark:text-white leading-relaxed">
              {room.prompt}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-black/30 dark:text-white/30">
                {room.notes.length} {room.notes.length === 1 ? "response" : "responses"}
              </span>
              {recordingRoom !== room.id && (
                isSignedIn ? (
                  <button
                    onClick={() => setRecordingRoom(room.id)}
                    className="text-[11px] font-medium transition-colors hover:opacity-80"
                    style={{ color: accentColor || undefined }}
                  >
                    + Drop a voice note
                  </button>
                ) : (
                  <Link
                    href="/sign-in"
                    className="text-[11px] font-medium text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Sign in to respond
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Recorder */}
          {recordingRoom === room.id && (
            <VoiceRecorder
              roomId={room.id}
              username={username}
              accentColor={accentColor}
              onRecorded={(note) => {
                setRooms((prev) =>
                  prev.map((r) =>
                    r.id === room.id ? { ...r, notes: [note, ...r.notes] } : r
                  )
                );
                setRecordingRoom(null);
              }}
              onCancel={() => setRecordingRoom(null)}
            />
          )}

          {/* Voice notes */}
          {room.notes.length > 0 && (
            <div className="flex flex-col gap-2">
              {room.notes.map((note) => (
                <AudioPlayer key={note.id} note={note} accentColor={accentColor} />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
