import { notFound } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BookingClient } from "./BookingClient";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.bookingEnabled) notFound();

  return (
    <BookingClient
      username={profile.username}
      hostName={profile.name || profile.username}
      title={profile.bookingTitle || "Book a call"}
      duration={profile.bookingDuration ?? 30}
      accentColor={profile.accentColor || undefined}
    />
  );
}
