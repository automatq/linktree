import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, subscribers, unsubscribes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/** Public unsubscribe endpoint — linked from emails */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return new Response(unsubPage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile) {
    return new Response(unsubPage("Profile not found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Remove from subscribers list
  await db
    .delete(subscribers)
    .where(
      and(eq(subscribers.profileId, profile.id), eq(subscribers.email, email))
    );

  // Also add to unsubscribes table (covers booking/order contacts)
  await db
    .insert(unsubscribes)
    .values({ id: crypto.randomUUID(), profileId: profile.id, email })
    .onConflictDoNothing();

  return new Response(
    unsubPage("You have been unsubscribed. You will no longer receive emails."),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function unsubPage(message: string) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff;color:#111}
.box{text-align:center;padding:2rem}</style></head>
<body><div class="box"><p>${escaped}</p></div></body></html>`;
}
