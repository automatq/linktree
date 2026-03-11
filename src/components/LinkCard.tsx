"use client";

import { Icon, ArrowRightIcon } from "./Icons";
import type { Link } from "@/data/links";

export type CardStyle = "minimal" | "solid" | "ghost" | "lift" | "sharp";

type StyleConfig = {
  card: string;
  iconWrap: string;
  title: string;
  desc: string;
  arrow: string;
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
    iconWrap: "bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:text-white dark:bg-black/10 dark:text-black/60 dark:group-hover:bg-black/20 dark:group-hover:text-black",
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

type LinkCardProps = {
  link: Link;
  index: number;
  cardStyle?: CardStyle;
};

export function LinkCard({ link, index, cardStyle = "minimal" }: LinkCardProps) {
  const s = STYLES[cardStyle] ?? STYLES.minimal;

  return (
    <a
      href={`/api/go/${link.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`animate-fade-in-up group flex items-center gap-4 px-5 py-4 transition-all duration-200 ${s.card}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {link.icon && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${s.iconWrap}`}>
          <Icon name={link.icon} size={18} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-sm font-medium ${s.title}`}>
          {link.title}
        </span>
        {link.description && (
          <span className={`truncate text-xs mt-0.5 ${s.desc}`}>
            {link.description}
          </span>
        )}
      </div>
      <ArrowRightIcon
        size={14}
        className={`shrink-0 transition-all duration-200 ${s.arrow}`}
      />
    </a>
  );
}
