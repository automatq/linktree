"use client";

import { useState } from "react";
import { contrastText } from "@/lib/contrast";

export function EmailCaptureWidget({
  username,
  title,
  buttonText,
  accentColor,
}: {
  username: string;
  title: string;
  buttonText: string;
  accentColor?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/subscribe/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong");
    }
  }

  const btnStyle = accentColor
    ? { backgroundColor: accentColor, color: contrastText(accentColor) }
    : { backgroundColor: "black", color: "white" };

  if (status === "success") {
    return (
      <div className="w-full rounded-xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] p-5 flex flex-col items-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-black dark:text-white">You&apos;re subscribed!</p>
        <p className="text-xs text-black/40 dark:text-white/40">Thanks — you&apos;ll hear from me soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] p-5">
      <p className="text-sm font-semibold text-black dark:text-white mb-3">{title}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
        />
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
        />
        {errorMsg && (
          <p className="text-xs text-red-500">{errorMsg}</p>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-9 w-full rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={btnStyle}
        >
          {status === "loading" ? "Subscribing…" : buttonText}
        </button>
      </form>
    </div>
  );
}
