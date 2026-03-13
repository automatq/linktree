"use client";

import { useState } from "react";

export function ContactFormWidget({
  username,
  title,
  accentColor,
}: {
  username: string;
  title: string;
  accentColor?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/contact/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to send");
        setSending(false);
        return;
      }

      setSent(true);
      setSending(false);
    } catch {
      setError("Something went wrong");
      setSending(false);
    }
  }

  const accent = accentColor || undefined;

  if (sent) {
    return (
      <div className="rounded-xl border border-black/8 dark:border-white/8 p-6 text-center">
        <div className="mb-2 text-lg text-black dark:text-white">Message sent</div>
        <p className="text-xs text-black/40 dark:text-white/40 mb-3">
          Thanks for reaching out. You should hear back soon.
        </p>
        <button
          onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); setError(""); }}
          className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white underline transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
      </div>
      <form onSubmit={handleSubmit} className="px-4 pb-4 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="h-9 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            className="h-9 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message..."
          required
          rows={3}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors resize-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={sending || !name.trim() || !email.trim() || !message.trim()}
          className={`h-9 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${accent ? "" : "bg-black dark:bg-white text-white dark:text-black"}`}
          style={accent ? { backgroundColor: accent, color: "#fff" } : undefined}
        >
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
