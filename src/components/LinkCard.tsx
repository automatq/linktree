"use client";

import { Icon, ArrowRightIcon } from "./Icons";
import type { Link } from "@/data/links";

type LinkCardProps = {
  link: Link;
  index: number;
};

export function LinkCard({ link, index }: LinkCardProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="animate-fade-in-up group flex items-center gap-4 rounded-xl border border-black/8 bg-black/[0.03] px-5 py-4 transition-all duration-200 hover:border-black/20 hover:bg-black/[0.06] active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.07]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {link.icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 text-black/50 transition-colors group-hover:bg-black/10 group-hover:text-black/80 dark:bg-white/5 dark:text-white/60 dark:group-hover:bg-white/10 dark:group-hover:text-white">
          <Icon name={link.icon} size={18} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-black dark:text-white">
          {link.title}
        </span>
        {link.description && (
          <span className="truncate text-xs text-black/40 mt-0.5 dark:text-white/40">
            {link.description}
          </span>
        )}
      </div>
      <ArrowRightIcon
        size={14}
        className="shrink-0 text-black/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-black/50 dark:text-white/20 dark:group-hover:text-white/60"
      />
    </a>
  );
}
