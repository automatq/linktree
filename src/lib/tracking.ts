export function parseDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (!ua) return "desktop";
  const u = ua.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(u)) return "tablet";
  if (/(mobi|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop)/.test(u)) return "mobile";
  return "desktop";
}

const REFERRER_LABELS: Record<string, string> = {
  "instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "t.co": "X / Twitter",
  "twitter.com": "X / Twitter",
  "x.com": "X / Twitter",
  "facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "lnkd.in": "LinkedIn",
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "tiktok.com": "TikTok",
  "snapchat.com": "Snapchat",
  "pinterest.com": "Pinterest",
  "reddit.com": "Reddit",
  "google.com": "Google",
  "bing.com": "Bing",
};

export function parseReferrer(referer: string): string {
  if (!referer) return "Direct";
  try {
    const url = new URL(referer);
    const hostname = url.hostname.replace(/^www\./, "");
    return REFERRER_LABELS[hostname] ?? hostname;
  } catch {
    return "Direct";
  }
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}
