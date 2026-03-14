"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

type Review = {
  id: string;
  recommend: boolean;
  audioUrl: string;
  audioDuration: number;
  text: string;
  photos: string[];
  verifiedClient: boolean;
  response: string;
  respondedAt?: string;
  createdAt: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  authorAvatarInitials: string;
};

type Stats = { total: number; recommended: number; percentage: number };

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

// ── Mini Audio Player ───────────────────────────────────────────────────────

function ReviewPlayer({ audioUrl, duration, accentColor }: { audioUrl: string; duration: number; accentColor?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause(); else el.play().catch(() => {});
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onTime = () => { if (el.duration) setProgress(el.currentTime / el.duration); };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    return () => { el.removeEventListener("play", onPlay); el.removeEventListener("pause", onPause); el.removeEventListener("ended", onEnded); el.removeEventListener("timeupdate", onTime); };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={toggle}
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ backgroundColor: accentColor || "#000", color: "#fff" }}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 w-full rounded-full bg-black/8 dark:bg-white/8 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress * 100}%`, backgroundColor: accentColor || "#000" }} />
        </div>
        <span className="text-[9px] text-black/30 dark:text-white/30">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

// ── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({ review, accentColor }: { review: Review; accentColor?: string }) {
  const [photoView, setPhotoView] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-3">
      {/* Author + rating */}
      <div className="flex items-center gap-3">
        <Link href={`/${review.authorUsername}`} className="shrink-0">
          <div className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10 transition-all">
            {review.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-black/30 dark:text-white/30">{review.authorAvatarInitials || "?"}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/${review.authorUsername}`} className="text-sm font-medium text-black dark:text-white hover:underline truncate">
              @{review.authorUsername}
            </Link>
            {review.verifiedClient && (
              <span className="shrink-0 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Verified Client
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${review.recommend ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {review.recommend ? "Recommends" : "Doesn't recommend"}
            </span>
            <span className="text-[10px] text-black/25 dark:text-white/25">{timeAgo(review.createdAt)}</span>
          </div>
        </div>
        {/* Thumbs icon */}
        <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${review.recommend ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
          {review.recommend ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
          )}
        </div>
      </div>

      {/* Voice review */}
      <ReviewPlayer audioUrl={review.audioUrl} duration={review.audioDuration} accentColor={accentColor} />

      {/* Text summary */}
      {review.text && (
        <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed">{review.text}</p>
      )}

      {/* Photos */}
      {review.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {review.photos.map((url, i) => (
            <button key={i} onClick={() => setPhotoView(url)} className="shrink-0 h-20 w-20 rounded-lg overflow-hidden border border-black/8 dark:border-white/8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Creator response */}
      {review.response && (
        <div className="ml-6 pl-3 border-l-2 border-black/10 dark:border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-black/30 dark:text-white/30 mb-1">Response</p>
          <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{review.response}</p>
        </div>
      )}

      {/* Photo lightbox */}
      {photoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPhotoView(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPhotoView(null)} className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoView} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review Form (Recorder) ──────────────────────────────────────────────────

function ReviewForm({
  username,
  accentColor,
  onSubmitted,
  onCancel,
}: {
  username: string;
  accentColor?: string;
  onSubmitted: (review: Review) => void;
  onCancel: () => void;
}) {
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const MAX_DURATION = 60;

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
          if (prev >= MAX_DURATION - 1) { recorder.stop(); setRecording(false); clearInterval(timer.current); return MAX_DURATION; }
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

  async function submit() {
    if (recommend === null) { setError("Please select thumbs up or down"); return; }
    if (!audioBlob) { setError("Record your voice review first"); return; }
    if (elapsed < 5) { setError("Review must be at least 5 seconds"); return; }

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "review.webm");
      form.append("recommend", String(recommend));
      form.append("text", text);
      form.append("duration", String(elapsed));
      photos.forEach((p, i) => form.append(`photo${i}`, p));

      const res = await fetch(`/api/reviews/${username}`, { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong"); return; }
      onSubmitted(d.review);
    } catch {
      setError("Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    return () => { clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-4">
      <p className="text-sm font-medium text-black dark:text-white">Leave a review</p>

      {/* Thumbs up / down */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wider">Would you recommend?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setRecommend(true)}
            className={`flex-1 h-10 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${recommend === true ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            Yes
          </button>
          <button
            onClick={() => setRecommend(false)}
            className={`flex-1 h-10 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${recommend === false ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400" : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            No
          </button>
        </div>
      </div>

      {/* Voice recorder */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wider">Voice review (required, 15-60 sec)</p>
        {!audioBlob ? (
          recording ? (
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-mono text-black dark:text-white tabular-nums">{formatDuration(elapsed)}</span>
              <span className="text-[10px] text-black/30 dark:text-white/30">/ {formatDuration(MAX_DURATION)}</span>
              <button onClick={stopRecording} className="ml-auto h-8 px-4 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors">Stop</button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="h-9 w-full rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor || "#000" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
              Record your review
            </button>
          )
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-black dark:text-white">{formatDuration(elapsed)}</span>
            <span className="text-xs text-emerald-500 font-medium">Recorded</span>
            <button onClick={() => { setAudioBlob(null); setElapsed(0); }} className="ml-auto text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">Re-record</button>
          </div>
        )}
      </div>

      {/* Optional text */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wider">Written summary (optional)</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Briefly describe your experience..."
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none"
        />
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wider">Photos (optional, up to 3)</p>
        <div className="flex gap-2 items-center">
          {photos.map((p, i) => (
            <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-black/8 dark:border-white/8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
              <button onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <button
              onClick={() => fileInput.current?.click()}
              className="h-16 w-16 rounded-lg border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-black/30 dark:text-white/30 hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && photos.length < 3) setPhotos((prev) => [...prev, f]);
            e.target.value = "";
          }} />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={uploading}
          className="h-9 flex-1 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: accentColor || "#000" }}
        >
          {uploading ? "Submitting…" : "Submit review"}
        </button>
        <button onClick={onCancel} className="h-9 px-4 rounded-lg border border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── Main ReviewSection ──────────────────────────────────────────────────────

export function ReviewSection({
  username,
  accentColor,
}: {
  username: string;
  accentColor?: string;
}) {
  const { isSignedIn } = useUser();
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${username}`)
      .then((r) => r.json())
      .then((d) => {
        setReviewsList(d.reviews || []);
        setStats(d.stats || null);
        setLoaded(true);
      });
  }, [username]);

  if (!loaded) return null;

  return (
    <section className="w-full flex flex-col gap-3">
      {/* Header + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
            Reviews
          </span>
          {stats && (
            <span className={`text-[11px] font-semibold ${stats.percentage >= 80 ? "text-emerald-600 dark:text-emerald-400" : stats.percentage >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
              {stats.percentage}% recommend
            </span>
          )}
          {stats && (
            <span className="text-[10px] text-black/25 dark:text-white/25">({stats.total})</span>
          )}
          <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
        </div>
        {!showForm && (
          isSignedIn ? (
            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 ml-3 h-7 px-3 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
              style={accentColor ? { backgroundColor: accentColor + "18", color: accentColor } : undefined}
            >
              + Leave a review
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="shrink-0 ml-3 h-7 px-3 rounded-lg text-[11px] font-medium text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10 flex items-center hover:text-black dark:hover:text-white transition-colors"
            >
              Sign in to review
            </Link>
          )
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <ReviewForm
          username={username}
          accentColor={accentColor}
          onSubmitted={(review) => {
            setReviewsList((prev) => [review, ...prev]);
            const newTotal = (stats?.total || 0) + 1;
            const newRec = (stats?.recommended || 0) + (review.recommend ? 1 : 0);
            setStats({ total: newTotal, recommended: newRec, percentage: Math.round((newRec / newTotal) * 100) });
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Reviews list */}
      {reviewsList.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 py-10 flex flex-col items-center gap-2">
          <p className="text-sm text-black/30 dark:text-white/30">No reviews yet</p>
          <p className="text-xs text-black/20 dark:text-white/20">Be the first to leave a voice review</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviewsList.map((review) => (
            <ReviewCard key={review.id} review={review} accentColor={accentColor} />
          ))}
        </div>
      )}
    </section>
  );
}
