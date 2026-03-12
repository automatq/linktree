import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import Link from "next/link";
import { db } from "@/db";
import { profiles, links, socialLinks, profileViews } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";
import { LinkCard, type CardStyle, type CardSize } from "@/components/LinkCard";
import { SocialLinks } from "@/components/SocialLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { userId } = await auth();

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile) notFound();

  const isOwner = userId === profile.userId;

  const [userLinks, userSocials] = await Promise.all([
    db.select().from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position)),
    db.select().from(socialLinks).where(eq(socialLinks.profileId, profile.id)).orderBy(asc(socialLinks.position)),
  ]);

  // Filter links by schedule (headers always shown)
  const now = new Date();
  const visibleLinks = userLinks.filter((link) => {
    if (link.type === "header") return true;
    if (link.startsAt && now < link.startsAt) return false;
    if (link.endsAt && now > link.endsAt) return false;
    return true;
  });

  // Track view after response is sent — no latency impact
  after(async () => {
    await db.insert(profileViews).values({ profileId: profile.id }).catch(() => {});
  });

  const cardStyle = (profile.cardStyle ?? "minimal") as CardStyle;
  const cardSize = (profile.cardSize ?? "md") as CardSize;
  const accentColor = profile.accentColor || undefined;

  const profileScale: Record<CardSize, {
    avatarSize: number;
    gap: string;
    name: string;
    username: string;
    bio: string;
  }> = {
    sm:  { avatarSize: 56,  gap: "gap-3", name: "text-base",  username: "text-xs",  bio: "text-xs"  },
    md:  { avatarSize: 80,  gap: "gap-4", name: "text-lg",    username: "text-sm",  bio: "text-sm"  },
    lg:  { avatarSize: 104, gap: "gap-5", name: "text-xl",    username: "text-sm",  bio: "text-sm"  },
    xl:  { avatarSize: 132, gap: "gap-6", name: "text-2xl",   username: "text-base",bio: "text-base" },
  };
  const ps = profileScale[cardSize];

  const fontMap: Record<string, string> = {
    mono: "var(--font-geist-mono), monospace",
    sans: "var(--font-geist-sans), sans-serif",
    inter: "var(--font-inter), sans-serif",
  };
  const fontFamily = fontMap[profile.font ?? "mono"] ?? fontMap.mono;

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200" style={{ fontFamily }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none dark:block hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] flex items-center gap-2">
        {isOwner && (
          <Link
            href="/admin"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 px-3 text-xs font-medium text-black/50 dark:text-white/50 hover:border-black/25 hover:text-black dark:hover:border-white/25 dark:hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit profile
          </Link>
        )}
        <CopyLinkButton />
        <ThemeToggle />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-16">
        <section className={`animate-fade-in-up mb-8 flex flex-col items-center ${ps.gap} text-center`}>
          <Avatar initials={profile.avatarInitials} avatarUrl={profile.avatarUrl || undefined} size={ps.avatarSize} accentColor={accentColor} />
          <div>
            <h1 className={`${ps.name} font-semibold text-black dark:text-white tracking-tight`}>
              {profile.name}
            </h1>
            <p className={`${ps.username} text-black/40 dark:text-white/40 mt-0.5`}>@{profile.username}</p>
          </div>
          {profile.bio && (
            <p className={`max-w-xs ${ps.bio} leading-relaxed text-black/60 dark:text-white/60`}>
              {profile.bio}
            </p>
          )}
        </section>

        <div className="mb-6 h-px w-full bg-black/5 dark:bg-white/5" />

        <section className="w-full flex flex-col gap-2.5">
          {visibleLinks.map((link, i) =>
            link.type === "header" ? (
              <div key={link.id} className="animate-fade-in-up pt-3 pb-0.5 flex items-center gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
                  {link.title}
                </span>
                <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
              </div>
            ) : (
              <LinkCard key={link.id} link={{ ...link, type: (link.type as "link" | "header") ?? "link", startsAt: undefined, endsAt: undefined }} index={i} cardStyle={cardStyle} cardSize={cardSize} accentColor={accentColor} />
            )
          )}
        </section>

        <footer className="mt-auto pt-16 flex flex-col items-center gap-3">
          <SocialLinks links={userSocials} size={cardSize} />
          <p className="text-xs text-black/15 dark:text-white/15 select-none">
            Built with <span className="text-black/25 dark:text-white/25">Next.js</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
