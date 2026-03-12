"use client";
import { useEffect, useRef } from "react";
import type { Link } from "@/data/links";

export type EmbedPlatform = "youtube" | "spotify" | "tweet" | null;

export function getEmbedPlatform(url: string): EmbedPlatform {
  if (/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)/.test(url)) return "youtube";
  if (/open\.spotify\.com\//.test(url)) return "spotify";
  if (/(?:twitter\.com|x\.com)\/[^/]+\/status\//.test(url)) return "tweet";
  return null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

function getSpotifyEmbedUrl(url: string): { src: string; compact: boolean } | null {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  const compact = m[1] === "track" || m[1] === "episode";
  return {
    src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`,
    compact,
  };
}

function TweetEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const dark = document.documentElement.classList.contains("dark");
    ref.current.innerHTML = `<blockquote class="twitter-tweet" data-theme="${dark ? "dark" : "light"}"><a href="${url}"></a></blockquote>`;

    const twttr = (window as unknown as Record<string, unknown>).twttr as { widgets?: { load: (el: HTMLElement) => void } } | undefined;
    if (twttr?.widgets) {
      twttr.widgets.load(ref.current);
      return;
    }

    if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      document.body.appendChild(script);
    } else {
      setTimeout(() => {
        const t = (window as unknown as Record<string, unknown>).twttr as { widgets?: { load: (el: HTMLElement | null) => void } } | undefined;
        t?.widgets?.load(ref.current);
      }, 200);
    }
  }, [url]);

  return <div ref={ref} className="flex justify-center" />;
}

export function EmbedCard({ link }: { link: Link }) {
  const platform = getEmbedPlatform(link.url);
  if (!platform) return null;

  const ytSrc = platform === "youtube" ? getYouTubeEmbedUrl(link.url) : null;
  const spotifyInfo = platform === "spotify" ? getSpotifyEmbedUrl(link.url) : null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-black/8 dark:border-white/8 bg-white dark:bg-black">
      {link.title && (
        <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {link.title}
        </div>
      )}

      {platform === "youtube" && ytSrc && (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={ytSrc}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={link.title || "YouTube video"}
          />
        </div>
      )}

      {platform === "spotify" && spotifyInfo && (
        <iframe
          src={spotifyInfo.src}
          width="100%"
          height={spotifyInfo.compact ? 80 : 352}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={link.title || "Spotify"}
          style={{ display: "block" }}
        />
      )}

      {platform === "tweet" && (
        <div className="px-3 py-3">
          <TweetEmbed url={link.url} />
        </div>
      )}
    </div>
  );
}
