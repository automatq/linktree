import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import Link from "next/link";
import { db } from "@/db";
import { profiles, links, socialLinks, profileViews, products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";
import { LinkCard, type CardStyle, type CardSize } from "@/components/LinkCard";
import { SocialLinks } from "@/components/SocialLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmbedCard } from "@/components/EmbedCard";
import { ProductCard } from "@/components/ProductCard";
import { EmailCaptureWidget } from "@/components/EmailCaptureWidget";
import { BookingClient } from "@/app/book/[username]/BookingClient";

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

  const [userLinks, userSocials, userProducts] = await Promise.all([
    db.select().from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position)),
    db.select().from(socialLinks).where(eq(socialLinks.profileId, profile.id)).orderBy(asc(socialLinks.position)),
    db.select().from(products).where(eq(products.profileId, profile.id)).orderBy(asc(products.position)),
  ]);
  const activeProducts = userProducts.filter((p) => p.active);

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

  const bgType = profile.bgType ?? "none";
  const bgValue = profile.bgValue ?? "";
  const hasBg = bgType !== "none" && bgValue;
  const bgStyle: React.CSSProperties = hasBg
    ? bgType === "image"
      ? { backgroundImage: `url(${bgValue})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
      : { background: bgValue }
    : {};

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
    <div className={`min-h-screen transition-colors duration-200 ${hasBg ? "" : "bg-white dark:bg-black"}`} style={{ fontFamily, ...bgStyle }}>
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
            <p className={`max-w-xs ${ps.bio} leading-relaxed text-black/60 dark:text-white/60 whitespace-pre-wrap`}>
              {profile.bio}
            </p>
          )}
          {profile.socialLinksPosition === "bio" && userSocials.length > 0 && (
            <SocialLinks links={userSocials} size={cardSize} accentColor={accentColor} />
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
            ) : link.type === "embed" ? (
              <div key={link.id} className="animate-fade-in-up w-full" style={{ animationDelay: `${i * 60}ms` }}>
                <EmbedCard link={{ ...link, type: "embed" as const, startsAt: undefined, endsAt: undefined }} />
              </div>
            ) : link.type === "booking" && profile.bookingEnabled ? (
              <div key={link.id} className="animate-fade-in-up w-full rounded-xl border border-black/8 dark:border-white/8 overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                <BookingClient
                  username={profile.username}
                  hostName={profile.name || profile.username}
                  title={profile.bookingTitle || "Book a call"}
                  duration={profile.bookingDuration ?? 30}
                  accentColor={accentColor}
                  isInline
                />
              </div>
            ) : (
              <LinkCard key={link.id} link={{ ...link, type: (link.type as "link" | "header") ?? "link", startsAt: undefined, endsAt: undefined }} index={i} cardStyle={cardStyle} cardSize={cardSize} accentColor={accentColor} />
            )
          )}
        </section>

        {/* Store */}
        {activeProducts.length > 0 && (
          <section className="w-full flex flex-col gap-2.5 mt-4">
            <div className="flex items-center gap-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
                Store
              </span>
              <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
            </div>
            {activeProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={{ ...p, coverUrl: p.coverUrl ?? "", fileUrl: p.fileUrl ?? "" }}
                username={profile.username}
                accentColor={accentColor}
              />
            ))}
          </section>
        )}

        {/* Email capture */}
        {profile.emailCaptureEnabled && (
          <section className="w-full mt-4">
            <EmailCaptureWidget
              username={profile.username}
              title={profile.emailCaptureTitle || "Stay in the loop"}
              buttonText={profile.emailCaptureButtonText || "Subscribe"}
              accentColor={accentColor}
            />
          </section>
        )}

        <footer className="mt-auto pt-16 flex flex-col items-center gap-3">
          {(profile.socialLinksPosition ?? "footer") === "footer" && (
            <SocialLinks links={userSocials} size={cardSize} accentColor={accentColor} />
          )}
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL || "https://trilink.app"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-black/20 dark:text-white/20 hover:text-black/40 dark:hover:text-white/40 transition-colors select-none"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3L4 14h7v7l9-11h-7z"/>
            </svg>
            Powered by Trilink
          </a>
        </footer>
      </main>
    </div>
  );
}
