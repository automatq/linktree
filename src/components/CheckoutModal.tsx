"use client";

import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import type { Product } from "@/data/links";

export function CheckoutModal({
  product,
  username,
  onClose,
}: {
  product: Product;
  username: string;
  accentColor?: string;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, username }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) {
          setClientSecret(d.clientSecret);
          setStripeAccountId(d.stripeAccountId || null);
        } else {
          setError(d.error || "Failed to start checkout");
        }
      })
      .catch(() => setError("Failed to start checkout"));
  }, [product.id, username]);

  // Create stripePromise scoped to the seller's connected account
  const stripePromise = useMemo(() => {
    if (!stripeAccountId || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null;
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, {
      stripeAccount: stripeAccountId,
    });
  }, [stripeAccountId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 dark:border-white/8">
          <p className="text-sm font-semibold text-black dark:text-white">{product.title}</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-500">{error}</p>
              {error.includes("not connected") && (
                <p className="text-xs text-black/40 dark:text-white/40 mt-2">
                  The seller has not set up payments yet.
                </p>
              )}
            </div>
          ) : !clientSecret || !stripePromise ? (
            <div className="p-8 flex justify-center">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
}
