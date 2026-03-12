"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import type { Product } from "@/data/links";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export function CheckoutModal({
  product,
  username,
  accentColor: _accentColor,
  onClose,
}: {
  product: Product;
  username: string;
  accentColor?: string;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, username }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setError(d.error || "Failed to start checkout");
      })
      .catch(() => setError("Failed to start checkout"));
  }, [product.id, username]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 dark:border-white/8">
          <div>
            <p className="text-sm font-semibold text-black dark:text-white">{product.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Checkout content */}
        <div className="p-0 max-h-[80vh] overflow-y-auto">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-2">
                {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  ? "Stripe is not configured yet."
                  : "Please try again."}
              </p>
            </div>
          ) : !clientSecret ? (
            <div className="p-8 flex justify-center">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : stripePromise ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-black/50 dark:text-white/50">Stripe is not configured.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
