"use client";

import { useState } from "react";
import type { Product } from "@/data/links";
import { CheckoutModal } from "./CheckoutModal";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function ProductCard({
  product,
  username,
  accentColor,
}: {
  product: Product;
  username: string;
  accentColor?: string;
}) {
  const [showCheckout, setShowCheckout] = useState(false);

  const accentStyle = accentColor ? { backgroundColor: accentColor } : {};

  return (
    <>
      <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] overflow-hidden flex flex-col">
        {product.coverUrl && (
          <div className="w-full aspect-video bg-black/5 dark:bg-white/5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.coverUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black dark:text-white leading-tight">
                {product.title}
              </p>
              {product.description && (
                <p className="text-xs text-black/50 dark:text-white/50 mt-1 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-black dark:text-white tabular-nums">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full h-9 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 text-white"
            style={
              accentColor
                ? accentStyle
                : { backgroundColor: "black" }
            }
          >
            Buy {formatPrice(product.price, product.currency)}
          </button>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          product={product}
          username={username}
          accentColor={accentColor}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
