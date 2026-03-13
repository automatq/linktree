"use client";
import { useEffect, useRef, useState } from "react";
import type { Link } from "@/data/links";

export type EmbedPlatform = "youtube" | "spotify" | "tweet" | null;

export function getEmbedPlatform(url: string): EmbedPlatform {
  if (/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)/.test(url)) return "youtube";
  if (/open\.spotify\.com\//.test(url)) return "spotify";
  if (/(?:twitter\.com|x\.com)\/[^/]+\/status\//.test(url)) return "tweet";
  return null;
}

function getYouTubeVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

function isYouTubeLiveUrl(url: string): boolean {
  return /youtube\.com\/live\//.test(url);
}

function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const src = getYouTubeEmbedUrl(url);
  const [isLive, setIsLive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isYouTubeLiveUrl(url)) return;
    const id = getYouTubeVideoId(url);
    if (!id) return;
    fetch(`/api/youtube-live?videoId=${id}`)
      .then((r) => r.json())
      .then((d) => setIsLive(d.isLive))
      .catch(() => setIsLive(false));
  }, [url]);

  if (!src) return null;

  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title={title || "YouTube video"}
      />
      {isLive && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          LIVE
        </div>
      )}
    </div>
  );
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
    // Validate URL is a real Twitter/X status URL before embedding
    if (!/^https?:\/\/(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/.test(url)) return;
    const dark = document.documentElement.classList.contains("dark");
    ref.current.textContent = "";
    const blockquote = document.createElement("blockquote");
    blockquote.className = "twitter-tweet";
    blockquote.dataset.theme = dark ? "dark" : "light";
    const a = document.createElement("a");
    a.href = url;
    blockquote.appendChild(a);
    ref.current.appendChild(blockquote);

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

  const spotifyInfo = platform === "spotify" ? getSpotifyEmbedUrl(link.url) : null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-black/8 dark:border-white/8 bg-white dark:bg-black">
      {link.title && (
        <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {link.title}
        </div>
      )}

      {platform === "youtube" && (
        <YouTubeEmbed url={link.url} title={link.title} />
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
