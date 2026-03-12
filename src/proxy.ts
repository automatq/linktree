import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const isProtected = createRouteMatcher(["/admin(.*)"]);

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "trilink-nine-neon.vercel.app";

export default clerkMiddleware(async (auth, req) => {
  const host = req.headers.get("host") ?? "";
  const bareHost = host.replace(/:\d+$/, ""); // strip port for localhost

  // Custom domain routing — skip for main host, localhost, and vercel preview URLs
  if (
    bareHost &&
    bareHost !== APP_HOST &&
    !bareHost.endsWith(".vercel.app") &&
    bareHost !== "localhost"
  ) {
    try {
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`
        SELECT username FROM profiles
        WHERE custom_domain = ${bareHost}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const url = req.nextUrl.clone();
        url.pathname = `/${rows[0].username}`;
        return NextResponse.rewrite(url);
      }
    } catch {
      // If DB lookup fails, fall through to normal routing
    }
  }

  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
