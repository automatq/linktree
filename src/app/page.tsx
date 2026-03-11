import { readFileSync } from "fs";
import { join } from "path";
import { Avatar } from "@/components/Avatar";
import { LinkCard } from "@/components/LinkCard";
import { SocialLinks } from "@/components/SocialLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { LinksData } from "@/data/links";

function getData(): LinksData {
  return JSON.parse(
    readFileSync(join(process.cwd(), "src/data/links.json"), "utf-8")
  );
}

export const dynamic = "force-dynamic";

export default function Home() {
  const { profile, links, socialLinks } = getData();

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      {/* Subtle grid background */}
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

      {/* Theme toggle */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-16">
        {/* Profile */}
        <section className="animate-fade-in-up mb-8 flex flex-col items-center gap-4 text-center">
          <Avatar initials={profile.avatarInitials} avatarUrl={profile.avatarUrl} size={80} />
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
              {profile.name}
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 mt-0.5">{profile.username}</p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-black/60 dark:text-white/60">
            {profile.bio}
          </p>
        </section>

        {/* Divider */}
        <div className="mb-6 h-px w-full bg-black/5 dark:bg-white/5" />

        {/* Links */}
        <section className="w-full flex flex-col gap-2.5">
          {links.map((link, i) => (
            <LinkCard key={link.id} link={link} index={i} />
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-16 flex flex-col items-center gap-3">
          <SocialLinks links={socialLinks} />
          <p className="text-xs text-black/15 dark:text-white/15 select-none">
            Built with{" "}
            <span className="text-black/25 dark:text-white/25">Next.js</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
