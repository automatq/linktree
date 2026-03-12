"use client";

import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

export function TipJarWidget({
  username,
  title,
  amounts,
  accentColor,
}: {
  username: string;
  title: string;
  amounts: string; // comma-separated dollar amounts e.g. "3,5,10,25"
  accentColor?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; stripePublishableKey: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const presets = amounts
    .split(",")
    .map((a) => Number(a.trim()))
    .filter((a) => a > 0);

  const finalAmount = custom ? Number(custom) : selected;

  const stripePromise = useMemo(() => {
    if (!checkout?.stripePublishableKey) return null;
    return loadStripe(checkout.stripePublishableKey);
  }, [checkout?.stripePublishableKey]);

  async function startCheckout() {
    if (!finalAmount || finalAmount <= 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, amount: finalAmount }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to start checkout"); return; }
      setCheckout(d);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const accent = accentColor || "#000000";

  if (done) {
    return (
      <div className="w-full rounded-2xl border border-black/8 dark:border-white/8 p-6 flex flex-col items-center gap-2 text-center">
        <span className="text-2xl">🙏</span>
        <p className="text-sm font-medium text-black dark:text-white">Thank you!</p>
        <p className="text-xs text-black/40 dark:text-white/40">Your support means a lot.</p>
      </div>
    );
  }

  if (checkout && stripePromise) {
    return (
      <div className="w-full rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/8">
          <p className="text-xs font-medium text-black dark:text-white">{title}</p>
          <button
            onClick={() => setCheckout(null)}
            className="text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkout.clientSecret, onComplete: () => setDone(true) }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-black/8 dark:border-white/8 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">💸</span>
        <p className="text-sm font-semibold text-black dark:text-white">{title}</p>
      </div>

      {/* Preset amounts */}
      <div className="flex flex-wrap gap-2">
        {presets.map((amt) => (
          <button
            key={amt}
            onClick={() => { setSelected(amt); setCustom(""); }}
            className="flex h-9 items-center rounded-xl px-4 text-sm font-medium transition-all"
            style={
              selected === amt && !custom
                ? { backgroundColor: accent, color: "#fff", borderColor: accent, border: "1.5px solid" }
                : { border: "1.5px solid", borderColor: "rgba(0,0,0,0.1)", color: "inherit" }
            }
          >
            ${amt}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/40 dark:text-white/40">$</span>
        <input
          type="number"
          min="1"
          placeholder="Custom amount"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          className="h-9 flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={startCheckout}
        disabled={loading || !finalAmount || finalAmount <= 0}
        className="flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
        style={{ backgroundColor: accent, color: "#fff" }}
      >
        {loading ? "Loading..." : `Send $${finalAmount ?? "—"}`}
      </button>
    </div>
  );
}
