"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const target = url ?? window.location.href;
    navigator.clipboard.writeText(target).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 px-3 text-xs font-medium text-black/50 dark:text-white/50 hover:border-black/25 hover:text-black dark:hover:border-white/25 dark:hover:text-white transition-colors"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}
