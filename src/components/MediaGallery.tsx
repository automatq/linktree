"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/data/links";

export function MediaGallery({
  images,
  title,
  columns = 3,
  accentColor,
}: {
  images: GalleryImage[];
  title?: string;
  columns?: number;
  accentColor?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightbox = lightboxIndex !== null ? images[lightboxIndex] : null;

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, goPrev, goNext]);

  if (images.length === 0) return null;

  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-3";

  return (
    <>
      <section className="w-full flex flex-col gap-2.5">
        {title && (
          <div className="flex items-center gap-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
              {title}
            </span>
            <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
          </div>
        )}
        <div className={`grid ${gridClass} gap-1.5`}>
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={accentColor ? { "--tw-ring-color": accentColor } as React.CSSProperties : undefined}
            >
              <Image
                src={img.imageUrl}
                alt={img.caption || ""}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 33vw, 150px"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] text-white leading-tight line-clamp-2">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption || "Image lightbox"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Prev button */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {lightboxIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          <div
            className="relative max-w-lg w-full max-h-[85vh] flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-black/90 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxIndex(null)}
              aria-label="Close image"
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Image */}
            <div className="relative w-full" style={{ minHeight: "300px", maxHeight: "65vh" }}>
              <Image
                src={lightbox.imageUrl}
                alt={lightbox.caption || ""}
                fill
                className="object-contain bg-black/5 dark:bg-white/5"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            </div>

            {/* Caption + Link + Counter */}
            {(lightbox.caption || lightbox.linkUrl || images.length > 1) && (
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2 min-w-0">
                    {lightbox.caption && (
                      <p className="text-sm text-black dark:text-white leading-relaxed">{lightbox.caption}</p>
                    )}
                    {lightbox.linkUrl && (
                      <a
                        href={lightbox.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                        style={accentColor ? { color: accentColor } : undefined}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Visit link
                      </a>
                    )}
                  </div>
                  {images.length > 1 && (
                    <span className="shrink-0 text-[11px] text-black/30 dark:text-white/30 tabular-nums">
                      {lightboxIndex + 1} / {images.length}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
