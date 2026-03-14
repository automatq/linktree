"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon, ArrowRightIcon } from "./Icons";
import type { Link } from "@/data/links";

export type CardStyle = "minimal" | "solid" | "ghost" | "lift" | "sharp";
export type CardSize = "sm" | "md" | "lg" | "xl";

type StyleConfig = {
  card: string;
  iconWrap: string;
  title: string;
  desc: string;
  arrow: string;
};

type SizeConfig = {
  padding: string;
  gap: string;
  iconWrap: string;
  iconSize: number;
  title: string;
  desc: string;
  arrowSize: number;
};

const STYLES: Record<CardStyle, StyleConfig> = {
  minimal: {
    card: "rounded-xl border border-black/8 bg-black/[0.03] hover:border-black/20 hover:bg-black/[0.06] active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.07]",
    iconWrap: "bg-black/5 text-black/50 group-hover:bg-black/10 group-hover:text-black/80 dark:bg-white/5 dark:text-white/60 dark:group-hover:bg-white/10 dark:group-hover:text-white",
    title: "text-black dark:text-white",
    desc: "text-black/40 dark:text-white/40",
    arrow: "text-black/20 group-hover:translate-x-0.5 group-hover:text-black/50 dark:text-white/20 dark:group-hover:text-white/60",
  },
  solid: {
    card: "rounded-xl bg-black dark:bg-white hover:opacity-80 active:scale-[0.99]",
    iconWrap: "bg-white/10 text-white group-hover:bg-white/20 dark:bg-black/10 dark:text-black dark:group-hover:bg-black/20",
    title: "text-white dark:text-black",
    desc: "text-white/50 dark:text-black/50",
    arrow: "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/70 dark:text-black/30 dark:group-hover:text-black/70",
  },
  ghost: {
    card: "rounded-xl hover:bg-black/[0.04] active:scale-[0.99] dark:hover:bg-white/[0.04]",
    iconWrap: "bg-black/5 text-black/40 group-hover:text-black/70 dark:bg-white/5 dark:text-white/40 dark:group-hover:text-white/70",
    title: "text-black dark:text-white",
    desc: "text-black/40 dark:text-white/40",
    arrow: "text-black/15 group-hover:translate-x-0.5 group-hover:text-black/40 dark:text-white/15 dark:group-hover:text-white/40",
  },
  lift: {
    card: "rounded-xl border border-black/8 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-sm dark:border-white/8 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
    iconWrap: "bg-black/5 text-black/50 group-hover:bg-black/10 group-hover:text-black/80 dark:bg-white/5 dark:text-white/60 dark:group-hover:bg-white/10 dark:group-hover:text-white",
    title: "text-black dark:text-white",
    desc: "text-black/40 dark:text-white/40",
    arrow: "text-black/20 group-hover:translate-x-0.5 group-hover:text-black/50 dark:text-white/20 dark:group-hover:text-white/60",
  },
  sharp: {
    card: "rounded-none border-l-2 border-black/20 dark:border-white/15 hover:border-black dark:hover:border-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] active:opacity-75",
    iconWrap: "bg-black/5 text-black/50 group-hover:bg-black/8 group-hover:text-black/80 dark:bg-white/5 dark:text-white/60 dark:group-hover:bg-white/8 dark:group-hover:text-white",
    title: "text-black dark:text-white",
    desc: "text-black/40 dark:text-white/40",
    arrow: "text-black/15 group-hover:translate-x-1.5 group-hover:text-black/50 dark:text-white/15 dark:group-hover:text-white/60",
  },
};

const SIZES: Record<CardSize, SizeConfig> = {
  sm: {
    padding: "px-3 py-2.5",
    gap: "gap-3",
    iconWrap: "h-7 w-7",
    iconSize: 14,
    title: "text-xs",
    desc: "text-[10px]",
    arrowSize: 12,
  },
  md: {
    padding: "px-5 py-4",
    gap: "gap-4",
    iconWrap: "h-9 w-9",
    iconSize: 18,
    title: "text-sm",
    desc: "text-xs",
    arrowSize: 14,
  },
  lg: {
    padding: "px-6 py-5",
    gap: "gap-4",
    iconWrap: "h-11 w-11",
    iconSize: 22,
    title: "text-base",
    desc: "text-sm",
    arrowSize: 15,
  },
  xl: {
    padding: "px-7 py-6",
    gap: "gap-5",
    iconWrap: "h-14 w-14",
    iconSize: 26,
    title: "text-lg",
    desc: "text-sm",
    arrowSize: 16,
  },
};

type LinkCardProps = {
  link: Link;
  index: number;
  cardStyle?: CardStyle;
  cardSize?: CardSize;
  accentColor?: string;
};

export function LinkCard({ link, index, cardStyle = "minimal", cardSize = "md", accentColor }: LinkCardProps) {
  const s = STYLES[cardStyle] ?? STYLES.minimal;
  const z = SIZES[cardSize] ?? SIZES.md;
  const [iframeOpen, setIframeOpen] = useState(false);

  const isSolid = cardStyle === "solid";

  // For solid + accent: override card background with accent, force white text
  const cardAccentStyle = accentColor && isSolid
    ? { backgroundColor: accentColor, color: "white" }
    : undefined;

  // For sharp + accent: tint the left border
  const sharpAccentStyle = accentColor && cardStyle === "sharp"
    ? { borderLeftColor: accentColor }
    : undefined;

  // For non-solid styles + accent: tint icon wrap background and color
  const iconAccentStyle = accentColor && !isSolid
    ? { backgroundColor: accentColor + "22", color: accentColor }
    : undefined;

  const actualUrl = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Fire click tracking
    fetch(`/api/go/${link.id}`, { method: "GET", redirect: "manual" }).catch(() => {});
    setIframeOpen(true);
  };

  const close = useCallback(() => setIframeOpen(false), []);

  // Escape key closes overlay
  useEffect(() => {
    if (!iframeOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iframeOpen, close]);

  return (
    <>
      <a
        href={actualUrl}
        onClick={handleClick}
        className={`animate-fade-in-up group flex items-center ${z.padding} ${z.gap} transition-all duration-200 ${s.card} cursor-pointer`}
        style={{ animationDelay: `${index * 60}ms`, ...cardAccentStyle, ...sharpAccentStyle }}
      >
        {link.icon && (
          <span
            className={`flex ${z.iconWrap} shrink-0 items-center justify-center rounded-lg transition-colors ${s.iconWrap}`}
            style={iconAccentStyle}
          >
            <Icon name={link.icon} size={z.iconSize} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`font-medium ${z.title} ${s.title} break-words`}>
            {link.title}
          </span>
          {link.description && (
            <span className={`mt-0.5 ${z.desc} ${s.desc} break-words`}>
              {link.description}
            </span>
          )}
        </div>
        <ArrowRightIcon
          size={z.arrowSize}
          className={`shrink-0 transition-all duration-200 ${s.arrow}`}
        />
      </a>

      {/* Iframe overlay */}
      {iframeOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={close}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-neutral-900 border-b border-black/10 dark:border-white/10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              {link.icon && <Icon name={link.icon} size={16} />}
              <span className="text-sm font-medium text-black dark:text-white truncate">
                {link.title}
              </span>
              <span className="text-[11px] text-black/30 dark:text-white/30 truncate hidden sm:inline">
                {actualUrl}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={actualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span className="hidden sm:inline">Open</span>
              </a>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Iframe */}
          <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={actualUrl}
              title={link.title}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      )}
    </>
  );
}
