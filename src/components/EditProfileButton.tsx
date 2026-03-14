"use client";

import { useUser } from "@clerk/nextjs";

export function EditProfileButton({ ownerUserId, appUrl }: { ownerUserId: string; appUrl: string }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user || user.id !== ownerUserId) return null;

  return (
    <a
      href={`${appUrl}/admin`}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 px-2 sm:px-3 text-xs font-medium text-black/50 dark:text-white/50 hover:border-black/25 hover:text-black dark:hover:border-white/25 dark:hover:text-white transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      <span className="hidden sm:inline">Edit profile</span>
    </a>
  );
}
