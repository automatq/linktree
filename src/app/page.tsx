import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (profile) redirect(`/${profile.username}`);
    else redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="fixed top-4 right-4"><ThemeToggle /></div>
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 gap-6 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
          Linktree
        </h1>
        <p className="text-sm text-black/50 dark:text-white/50 max-w-xs">
          All your links in one place. Create your free profile.
        </p>
        <div className="flex gap-3">
          <Link
            href="/sign-up"
            className="flex h-9 items-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:opacity-80 transition-opacity dark:bg-white dark:text-black"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="flex h-9 items-center rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
