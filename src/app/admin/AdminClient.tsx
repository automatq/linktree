"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useClerk } from "@clerk/nextjs";
import { QRCodeCanvas } from "qrcode.react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { LinksData, Link, SocialLink } from "@/data/links";
import { getEmbedPlatform } from "@/components/EmbedCard";

const ICONS = ["globe", "zap", "pen", "mail", "calendar", "phone", "video", "mappin", "star", "heart", "music", "file", "shop", "mic", "coffee", "tiktok", "github", "twitter", "linkedin", "youtube"];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

type Stats = {
  byLink: Record<string, number>;
  clicksByDay: Array<{ date: string; count: number }>;
  viewsByDay: Array<{ date: string; count: number }>;
  totalViews: number;
  bestDay: { date: string; count: number } | null;
  linkTitles: Record<string, string>;
  referrers: Array<{ label: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
};

export function AdminClient() {
  const [data, setData] = useState<LinksData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainMsg, setDomainMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [domainStatus, setDomainStatus] = useState<"idle" | "checking" | "active" | "pending" | "error">("idle");
  const [domainStatusMsg, setDomainStatusMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<"content" | "analytics" | "booking" | "store">("content");
  const [showQR, setShowQR] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [googleTagId, setGoogleTagId] = useState("");
  const [pixelSaving, setPixelSaving] = useState(false);
  const [pixelSaved, setPixelSaved] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroCtaUrl, setHeroCtaUrl] = useState("");
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryEnabled, setGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("Gallery");
  const [galleryColumns, setGalleryColumns] = useState(3);
  const [galleryImages, setGalleryImages] = useState<Array<{ id: string; imageUrl: string; caption: string; linkUrl: string; position: number }>>([]);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [gallerySaved, setGallerySaved] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [contactFormEnabled, setContactFormEnabled] = useState(false);
  const [contactFormTitle, setContactFormTitle] = useState("Get in touch");
  const [contactFormEmail, setContactFormEmail] = useState("");
  const [contactFormSmsNumber, setContactFormSmsNumber] = useState("");
  const [contactFormSaving, setContactFormSaving] = useState(false);
  const [contactFormSaved, setContactFormSaved] = useState(false);
  const { signOut } = useClerk();

  const checkDomainStatus = useCallback(async (domain: string) => {
    if (!domain) return;
    setDomainStatus("checking");
    setDomainStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/domain/verify?domain=${encodeURIComponent(domain)}`);
      const d = await res.json();
      setDomainStatus(d.status);
      setDomainStatusMsg(d.message + (d.hint ? ` — ${d.hint}` : ""));
    } catch {
      setDomainStatus("error");
      setDomainStatusMsg("Could not check domain status.");
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/data").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([d, s]) => {
      setData(d);
      if (d.profile?.username) setUsername(d.profile.username);
      if (d.profile?.customDomain) {
        setCustomDomain(d.profile.customDomain);
        // Auto-check status on load if domain is set
        checkDomainStatus(d.profile.customDomain);
      }
      if (d.profile?.metaPixelId) setMetaPixelId(d.profile.metaPixelId);
      if (d.profile?.tiktokPixelId) setTiktokPixelId(d.profile.tiktokPixelId);
      if (d.profile?.googleTagId) setGoogleTagId(d.profile.googleTagId);
      if (d.profile?.webhookUrl) setWebhookUrl(d.profile.webhookUrl);
      setHeroEnabled(d.profile?.heroEnabled ?? false);
      if (d.profile?.heroImageUrl) setHeroImageUrl(d.profile.heroImageUrl);
      if (d.profile?.heroHeadline) setHeroHeadline(d.profile.heroHeadline);
      if (d.profile?.heroSubtitle) setHeroSubtitle(d.profile.heroSubtitle);
      if (d.profile?.heroCtaText) setHeroCtaText(d.profile.heroCtaText);
      if (d.profile?.heroCtaUrl) setHeroCtaUrl(d.profile.heroCtaUrl);
      setContactFormEnabled(d.profile?.contactFormEnabled ?? false);
      if (d.profile?.contactFormTitle) setContactFormTitle(d.profile.contactFormTitle);
      if (d.profile?.contactFormEmail) setContactFormEmail(d.profile.contactFormEmail);
      if (d.profile?.contactFormSmsNumber) setContactFormSmsNumber(d.profile.contactFormSmsNumber);
      setGalleryEnabled(d.profile?.galleryEnabled ?? false);
      if (d.profile?.galleryTitle) setGalleryTitle(d.profile.galleryTitle);
      if (d.profile?.galleryColumns) setGalleryColumns(d.profile.galleryColumns);
      setStats(s);
      // Load gallery images
      fetch("/api/admin/gallery").then((r) => r.json()).then((g) => {
        if (g.images) setGalleryImages(g.images);
      });
    }).catch(() => {
      setLoadError(true);
    });
  }, [checkDomainStatus]);

  const save = useCallback(async (next: LinksData) => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const json = await res.json();
    if (json.username) setUsername(json.username);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-3">
        {loadError ? (
          <>
            <span className="text-sm text-red-500">Failed to load data</span>
            <button
              onClick={() => { setLoadError(false); window.location.reload(); }}
              className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline transition-colors"
            >
              Try again
            </button>
          </>
        ) : (
          <span className="text-sm text-black/50 dark:text-white/50">Loading…</span>
        )}
      </div>
    );
  }

  function updateProfile(field: string, value: string) {
    const next = { ...data!, profile: { ...data!.profile, [field]: value } };
    setData(next);
  }

  function updateLink(id: string, field: string, value: string | null) {
    const next = {
      ...data!,
      links: data!.links.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    };
    setData(next);
  }

  function addLink() {
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "New Link", description: "", url: "", icon: "globe", type: "link" as const },
      ],
    };
    setData(next);
  }

  function addSection() {
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "Section", description: "", url: "", icon: "", type: "header" as const },
      ],
    };
    setData(next);
  }

  function addEmbed() {
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "", description: "", url: "", icon: "", type: "embed" as const },
      ],
    };
    setData(next);
  }

  function addBookingWidget() {
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "Book a call", description: "", url: "", icon: "", type: "booking" as const },
      ],
    };
    setData(next);
  }

  function addCountdown() {
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "Coming soon", description: "", url: weekFromNow, icon: "", type: "countdown" as const },
      ],
    };
    setData(next);
  }

  function addRss() {
    const next = {
      ...data!,
      links: [
        ...data!.links,
        { id: genId(), title: "Latest post", description: "", url: "", icon: "", type: "rss" as const },
      ],
    };
    setData(next);
  }

  function deleteLink(id: string) {
    const next = { ...data!, links: data!.links.filter((l) => l.id !== id) };
    setData(next);
  }

  function moveLink(id: string, dir: -1 | 1) {
    const arr = [...data!.links];
    const idx = arr.findIndex((l) => l.id === id);
    const next_idx = idx + dir;
    if (next_idx < 0 || next_idx >= arr.length) return;
    [arr[idx], arr[next_idx]] = [arr[next_idx], arr[idx]];
    setData({ ...data!, links: arr });
  }

  function updateSocial(platform: string, field: string, value: string) {
    const next = {
      ...data!,
      socialLinks: data!.socialLinks.map((s) =>
        s.platform === platform ? { ...s, [field]: value } : s
      ),
    };
    setData(next);
  }

  function addSocial() {
    const next = {
      ...data!,
      socialLinks: [
        ...data!.socialLinks,
        { platform: genId(), url: "", icon: "globe" },
      ],
    };
    setData(next);
  }

  function deleteSocial(platform: string) {
    const next = {
      ...data!,
      socialLinks: data!.socialLinks.filter((s) => s.platform !== platform),
    };
    setData(next);
  }


  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      {/* Grid bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none dark:block hidden opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Header */}
      <header className="relative border-b border-black/8 dark:border-white/8 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4">
          {/* Top row: links + actions */}
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-3">
              {username && (
                <>
                  <a href={`/${username}`} target="_blank" className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                    ← Live page
                  </a>
                  <button
                    onClick={() => setShowQR(true)}
                    className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                  >
                    QR
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="flex h-7 items-center rounded-md border border-black/10 dark:border-white/10 px-3 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                Sign out
              </button>
              <ThemeToggle />
            </div>
          </div>
          {/* Bottom row: tab nav */}
          <nav className="flex gap-1 pb-2 -mx-1 overflow-x-auto scrollbar-none">
            {(["content", "analytics", "booking", "store"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-black/8 dark:bg-white/8 text-black dark:text-white"
                    : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-4 py-10 flex flex-col gap-8">

        {tab === "content" && (
          <>
            {/* Profile section */}
            <Section title="Profile" action={
              <div className="flex items-center gap-2">
                <span className={`text-xs transition-all duration-300 ${saved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                <button
                  onClick={() => save(data!)}
                  disabled={saving}
                  className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            }>
              <div className="flex gap-4 items-start">
                <AvatarUpload
                  avatarUrl={data.profile.avatarUrl}
                  initials={data.profile.avatarInitials}
                  onUploaded={(url) => {
                    const next = { ...data, profile: { ...data.profile, avatarUrl: url } };
                    setData(next);
                  }}
                />
                <div className="flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name">
                      <Input value={data.profile.name} onChange={(v) => updateProfile("name", v)} />
                    </Field>
                    <Field label="Username">
                      <Input value={data.profile.username} onChange={(v) => updateProfile("username", v)} />
                    </Field>
                    <Field label="Avatar Initials">
                      <Input value={data.profile.avatarInitials} onChange={(v) => updateProfile("avatarInitials", v)} maxLength={3} />
                    </Field>
                  </div>
                  <Field label="Bio">
                    <Textarea value={data.profile.bio} onChange={(v) => updateProfile("bio", v)} />
                  </Field>
                  <Field label="Font Style">
                    <FontPicker value={data.profile.font ?? "mono"} onChange={(v) => updateProfile("font", v)} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Templates section */}
            <Section title="Templates">
              <div className="flex flex-col gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">Apply a preset style to your profile in one click.</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { name: "Minimal",  font: "mono",  cardStyle: "minimal",  cardSize: "md",  accentColor: "",        bgType: "none",     bgValue: "",                                          preview: "bg-white dark:bg-black border border-black/10 dark:border-white/10" },
                    { name: "Creator",  font: "sans",  cardStyle: "rounded",  cardSize: "lg",  accentColor: "#f97316", bgType: "none",     bgValue: "",                                          preview: "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900" },
                    { name: "Business", font: "inter", cardStyle: "bordered", cardSize: "md",  accentColor: "#3b82f6", bgType: "none",     bgValue: "",                                          preview: "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900" },
                    { name: "Neon",     font: "mono",  cardStyle: "minimal",  cardSize: "md",  accentColor: "#22c55e", bgType: "color",    bgValue: "#0a0a0a",                                   preview: "bg-black border border-green-500/40" },
                    { name: "Sunset",   font: "sans",  cardStyle: "rounded",  cardSize: "lg",  accentColor: "#ec4899", bgType: "gradient", bgValue: "linear-gradient(135deg,#fdf2f8,#fce7f3)",   preview: "bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-200 dark:border-pink-900" },
                    { name: "Ocean",    font: "inter", cardStyle: "shadow",   cardSize: "md",  accentColor: "#06b6d4", bgType: "gradient", bgValue: "linear-gradient(135deg,#ecfeff,#cffafe)",   preview: "bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950/40 dark:to-teal-950/40 border border-cyan-200 dark:border-cyan-900" },
                  ] as const).map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        const next = {
                          ...data!,
                          profile: {
                            ...data!.profile,
                            font: tpl.font,
                            cardStyle: tpl.cardStyle,
                            cardSize: tpl.cardSize,
                            accentColor: tpl.accentColor,
                            bgType: tpl.bgType,
                            bgValue: tpl.bgValue,
                          },
                        };
                        setData(next);
                        save(next);
                      }}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 h-20 text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.98] ${tpl.preview}`}
                    >
                      <div className="flex gap-0.5">
                        {[14, 20, 12].map((w, i) => (
                          <div key={i} className="h-1.5 rounded-full bg-current opacity-20" style={{ width: w }} />
                        ))}
                      </div>
                      <div className="flex gap-0.5">
                        {[18, 10, 16].map((w, i) => (
                          <div key={i} className="h-1.5 rounded-full bg-current opacity-10" style={{ width: w }} />
                        ))}
                      </div>
                      <span className="mt-1 text-[10px] font-semibold tracking-wide opacity-60">{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Card Style section */}
            <Section title="Card Style">
              <StylePicker value={data.profile.cardStyle ?? "minimal"} onChange={(v) => updateProfile("cardStyle", v)} />
            </Section>

            {/* Card Size section */}
            <Section title="Card Size">
              <SizePicker value={data.profile.cardSize ?? "md"} onChange={(v) => updateProfile("cardSize", v)} />
            </Section>

            {/* Accent Color section */}
            <Section title="Accent Color">
              <ColorPicker value={data.profile.accentColor ?? ""} onChange={(v) => updateProfile("accentColor", v)} />
            </Section>

            {/* Background section */}
            <Section title="Background">
              <BgPicker
                bgType={data.profile.bgType ?? "none"}
                bgValue={data.profile.bgValue ?? ""}
                onTypeChange={(v) => updateProfile("bgType", v)}
                onValueChange={(v) => updateProfile("bgValue", v)}
              />
            </Section>

            {/* Featured Card section */}
            <Section
              title="Featured Card"
              action={
                <div className="flex items-center gap-2">
                  <span className={`text-xs transition-all duration-300 ${heroSaved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                  <button
                    onClick={async () => {
                      setHeroSaving(true);
                      await fetch("/api/admin/hero", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ heroEnabled, heroImageUrl, heroHeadline, heroSubtitle, heroCtaText, heroCtaUrl }),
                      });
                      setHeroSaving(false);
                      setHeroSaved(true);
                      setTimeout(() => setHeroSaved(false), 2000);
                    }}
                    disabled={heroSaving}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {heroSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Show featured card</p>
                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">Appears above your links — great for announcements, latest releases, or promotions</p>
                  </div>
                  <button
                    onClick={() => setHeroEnabled((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${heroEnabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${heroEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {heroEnabled && (
                  <>
                    {/* Image upload */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Cover image (optional)</label>
                      <div className="relative rounded-xl overflow-hidden border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]" style={{ minHeight: 96 }}>
                        {heroImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={heroImageUrl} alt="" className="w-full h-36 object-cover" />
                        ) : (
                          <div className="h-36 flex items-center justify-center text-black/20 dark:text-white/20">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                          <label className="flex h-7 items-center gap-1.5 rounded-md bg-black/70 dark:bg-white/80 px-2.5 text-[11px] font-medium text-white dark:text-black cursor-pointer hover:bg-black/80 transition-colors">
                            {heroUploading ? (
                              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            ) : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            )}
                            {heroUploading ? "Uploading…" : heroImageUrl ? "Replace" : "Upload"}
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setHeroUploading(true);
                                const form = new FormData();
                                form.append("file", file);
                                form.append("purpose", "hero");
                                const res = await fetch("/api/upload", { method: "POST", body: form });
                                const { url } = await res.json();
                                setHeroImageUrl(url);
                                setHeroUploading(false);
                              }}
                            />
                          </label>
                          {heroImageUrl && (
                            <button
                              onClick={() => setHeroImageUrl("")}
                              className="flex h-7 items-center rounded-md bg-black/70 dark:bg-white/80 px-2.5 text-[11px] font-medium text-white dark:text-black hover:bg-red-500 dark:hover:bg-red-500 dark:hover:text-white transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Text fields */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Headline</label>
                        <input
                          className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                          value={heroHeadline}
                          onChange={(e) => setHeroHeadline(e.target.value)}
                          placeholder="My new album is out now"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Subtitle (optional)</label>
                        <input
                          className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                          value={heroSubtitle}
                          onChange={(e) => setHeroSubtitle(e.target.value)}
                          placeholder="Available on all streaming platforms"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Button text (optional)</label>
                          <input
                            className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                            value={heroCtaText}
                            onChange={(e) => setHeroCtaText(e.target.value)}
                            placeholder="Listen now"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Button URL</label>
                          <input
                            className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                            value={heroCtaUrl}
                            onChange={(e) => setHeroCtaUrl(e.target.value)}
                            placeholder="https://"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* Links section */}
            <Section
              title="Links"
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={addSection}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Section
                  </button>
                  <button
                    onClick={addEmbed}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Embed
                  </button>
                  <button
                    onClick={addBookingWidget}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Booking
                  </button>
                  <button
                    onClick={addCountdown}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Countdown
                  </button>
                  <button
                    onClick={addRss}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> RSS
                  </button>
                  <button
                    onClick={addLink}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Link
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-2">
                {data.links.map((link, i) =>
                  link.type === "header" ? (
                    <SectionRow
                      key={link.id}
                      link={link}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onChange={(f, v) => updateLink(link.id, f, v)}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  ) : link.type === "embed" ? (
                    <EmbedRow
                      key={link.id}
                      link={link}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onChange={(f, v) => updateLink(link.id, f, v)}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  ) : link.type === "booking" ? (
                    <BookingWidgetRow
                      key={link.id}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  ) : link.type === "countdown" ? (
                    <CountdownRow
                      key={link.id}
                      link={link}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onChange={(f, v) => updateLink(link.id, f, v)}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  ) : link.type === "rss" ? (
                    <RssRow
                      key={link.id}
                      link={link}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onChange={(f, v) => updateLink(link.id, f, v)}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  ) : (
                    <LinkRow
                      key={link.id}
                      link={link}
                      clickCount={stats?.byLink[link.id] ?? 0}
                      isFirst={i === 0}
                      isLast={i === data.links.length - 1}
                      onChange={(f, v) => updateLink(link.id, f, v)}
                      onDelete={() => deleteLink(link.id)}
                      onMove={(dir) => moveLink(link.id, dir)}
                    />
                  )
                )}
              </div>
            </Section>

            {/* Social links section */}
            <Section
              title="Social Links"
              action={
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-lg border border-black/10 dark:border-white/10 p-0.5 text-[11px]">
                    {(["footer", "bio"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => updateProfile("socialLinksPosition", pos)}
                        className={`px-2.5 py-0.5 rounded-md capitalize transition-colors ${
                          (data.profile.socialLinksPosition ?? "footer") === pos
                            ? "bg-black dark:bg-white text-white dark:text-black font-medium"
                            : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        {pos === "footer" ? "Footer" : "Under bio"}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={addSocial}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Add
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-2">
                {data.socialLinks.map((social) => (
                  <SocialRow
                    key={social.platform}
                    social={social}
                    onChange={(f, v) => updateSocial(social.platform, f, v)}
                    onDelete={() => deleteSocial(social.platform)}
                  />
                ))}
              </div>
            </Section>

            {/* Contact Form section */}
            <Section
              title="Contact Form"
              action={
                <div className="flex items-center gap-2">
                  <span className={`text-xs transition-all duration-300 ${contactFormSaved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                  <button
                    onClick={async () => {
                      setContactFormSaving(true);
                      await fetch("/api/admin/contact-form", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contactFormEnabled, contactFormTitle, contactFormEmail, contactFormSmsNumber }),
                      });
                      setContactFormSaving(false);
                      setContactFormSaved(true);
                      setTimeout(() => setContactFormSaved(false), 2000);
                    }}
                    disabled={contactFormSaving}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {contactFormSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Show contact form</p>
                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">Let visitors send you a message directly from your profile</p>
                  </div>
                  <button
                    onClick={() => setContactFormEnabled((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${contactFormEnabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${contactFormEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {contactFormEnabled && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Widget title</label>
                      <input
                        className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                        value={contactFormTitle}
                        onChange={(e) => setContactFormTitle(e.target.value)}
                        placeholder="Get in touch"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Send messages to (email)</label>
                      <input
                        type="email"
                        className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                        value={contactFormEmail}
                        onChange={(e) => setContactFormEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Instant SMS alerts (optional)</label>
                      <input
                        type="tel"
                        className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                        value={contactFormSmsNumber}
                        onChange={(e) => setContactFormSmsNumber(e.target.value)}
                        placeholder="+1234567890"
                      />
                      <p className="text-[10px] text-black/30 dark:text-white/30">Get a text the moment someone messages you. Your number is never shared.</p>
                    </div>
                    {!contactFormEmail.trim() && !contactFormSmsNumber.trim() && (
                      <p className="text-xs text-amber-500">Add an email or phone number to receive messages.</p>
                    )}
                  </div>
                )}
              </div>
            </Section>

            {/* Media Gallery section */}
            <Section
              title="Media Gallery"
              action={
                <div className="flex items-center gap-2">
                  <span className={`text-xs transition-all duration-300 ${gallerySaved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                  <button
                    onClick={async () => {
                      setGallerySaving(true);
                      await Promise.all([
                        fetch("/api/admin/gallery", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "settings", galleryEnabled, galleryTitle, galleryColumns }),
                        }),
                        fetch("/api/admin/gallery", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "bulk", images: galleryImages }),
                        }),
                      ]);
                      setGallerySaving(false);
                      setGallerySaved(true);
                      setTimeout(() => setGallerySaved(false), 2000);
                    }}
                    disabled={gallerySaving}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {gallerySaving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Show gallery</p>
                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">Instagram-style photo/video grid on your profile</p>
                  </div>
                  <button
                    onClick={() => setGalleryEnabled((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${galleryEnabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${galleryEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {galleryEnabled && (
                  <>
                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Section title</label>
                        <input
                          className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                          value={galleryTitle}
                          onChange={(e) => setGalleryTitle(e.target.value)}
                          placeholder="Gallery"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Columns</label>
                        <div className="flex items-center gap-1 rounded-lg border border-black/10 dark:border-white/10 p-0.5 text-[11px]">
                          {[2, 3, 4].map((n) => (
                            <button
                              key={n}
                              onClick={() => setGalleryColumns(n)}
                              className={`flex-1 px-2 py-1 rounded-md text-center transition-colors ${
                                galleryColumns === n
                                  ? "bg-black dark:bg-white text-white dark:text-black font-medium"
                                  : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upload button */}
                    <div className="flex items-center gap-2">
                      <label className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-black/15 dark:border-white/15 px-3 text-xs text-black/50 dark:text-white/50 cursor-pointer hover:border-black/30 dark:hover:border-white/30 hover:text-black dark:hover:text-white transition-colors">
                        {galleryUploading ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        )}
                        {galleryUploading ? "Uploading…" : "Add image"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            setGalleryUploading(true);
                            let failed = 0;
                            for (const file of Array.from(files)) {
                              try {
                                const form = new FormData();
                                form.append("file", file);
                                form.append("purpose", "gallery");
                                const res = await fetch("/api/upload", { method: "POST", body: form });
                                if (!res.ok) { failed++; continue; }
                                const { url } = await res.json();
                                const newImg = {
                                  id: Math.random().toString(36).slice(2, 9),
                                  imageUrl: url,
                                  caption: "",
                                  linkUrl: "",
                                  position: galleryImages.length,
                                };
                                setGalleryImages((prev) => [...prev, newImg]);
                                await fetch("/api/admin/gallery", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "add", image: newImg }),
                                });
                              } catch { failed++; }
                            }
                            setGalleryUploading(false);
                            if (failed > 0) alert(`${failed} image${failed > 1 ? "s" : ""} failed to upload`);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-black/25 dark:text-white/25">{galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Image grid with edit controls */}
                    {galleryImages.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {galleryImages.map((img, i) => (
                          <div key={img.id} className="flex gap-3 items-start rounded-lg border border-black/8 dark:border-white/8 p-2">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            {/* Fields */}
                            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                              <input
                                className="h-7 w-full rounded-md border border-black/8 dark:border-white/8 bg-transparent px-2 text-xs text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                                value={img.caption}
                                onChange={(e) => setGalleryImages((prev) => prev.map((x) => x.id === img.id ? { ...x, caption: e.target.value } : x))}
                                placeholder="Caption (optional)"
                              />
                              <input
                                className="h-7 w-full rounded-md border border-black/8 dark:border-white/8 bg-transparent px-2 text-xs text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors font-mono"
                                value={img.linkUrl}
                                onChange={(e) => setGalleryImages((prev) => prev.map((x) => x.id === img.id ? { ...x, linkUrl: e.target.value } : x))}
                                placeholder="Link URL (optional)"
                              />
                            </div>
                            {/* Actions */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                onClick={() => {
                                  if (i === 0) return;
                                  setGalleryImages((prev) => {
                                    const arr = [...prev];
                                    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                                    return arr;
                                  });
                                }}
                                disabled={i === 0}
                                className="text-black/25 dark:text-white/25 hover:text-black dark:hover:text-white disabled:opacity-20 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                              </button>
                              <button
                                onClick={() => {
                                  if (i === galleryImages.length - 1) return;
                                  setGalleryImages((prev) => {
                                    const arr = [...prev];
                                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                                    return arr;
                                  });
                                }}
                                disabled={i === galleryImages.length - 1}
                                className="text-black/25 dark:text-white/25 hover:text-black dark:hover:text-white disabled:opacity-20 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                              <button
                                onClick={async () => {
                                  setGalleryImages((prev) => prev.filter((x) => x.id !== img.id));
                                  await fetch("/api/admin/gallery", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "delete", image: { id: img.id } }),
                                  });
                                }}
                                className="text-black/25 dark:text-white/25 hover:text-red-500 transition-colors mt-0.5"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Section>

            {/* Custom domain section */}
            <Section
              title="Custom Domain"
              action={
                customDomain ? (
                  <button
                    onClick={async () => {
                      setSavingDomain(true);
                      await fetch("/api/admin/domain", { method: "DELETE" });
                      setCustomDomain("");
                      setSavingDomain(false);
                      setDomainStatus("idle");
                      setDomainStatusMsg(null);
                      setDomainMsg({ text: "Domain removed", ok: true });
                      setTimeout(() => setDomainMsg(null), 3000);
                    }}
                    disabled={savingDomain}
                    className="text-xs text-black/30 dark:text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null
              }
            >
              <div className="flex flex-col gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">
                  Use your own domain (e.g. <span className="font-mono">links.yoursite.com</span>) for your profile page.
                </p>
                <div className="flex gap-2">
                  <input
                    className="h-8 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                    value={customDomain}
                    onChange={(e) => { setCustomDomain(e.target.value); setDomainStatus("idle"); setDomainStatusMsg(null); }}
                    placeholder="links.yoursite.com"
                  />
                  <button
                    onClick={async () => {
                      setSavingDomain(true);
                      setDomainMsg(null);
                      setDomainStatus("idle");
                      const res = await fetch("/api/admin/domain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ domain: customDomain }),
                      });
                      const d = await res.json();
                      setSavingDomain(false);
                      if (res.ok) {
                        setCustomDomain(d.domain);
                        setDomainMsg({ text: "Saved! Now set up DNS below.", ok: true });
                        setTimeout(() => setDomainMsg(null), 5000);
                        await checkDomainStatus(d.domain);
                      } else {
                        setDomainMsg({ text: d.error || "Failed to save", ok: false });
                        setTimeout(() => setDomainMsg(null), 6000);
                      }
                    }}
                    disabled={savingDomain || !customDomain.trim()}
                    className="flex h-8 items-center rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {savingDomain ? "Saving..." : "Save"}
                  </button>
                </div>
                {domainMsg && (
                  <p className={`text-xs ${domainMsg.ok ? "text-emerald-500" : "text-red-500"}`}>
                    {domainMsg.text}
                  </p>
                )}

                {/* Domain status indicator */}
                {customDomain && domainStatus !== "idle" && (
                  <div className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                    domainStatus === "active"
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : domainStatus === "error"
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-amber-50 dark:bg-amber-900/20"
                  }`}>
                    {domainStatus === "checking" ? (
                      <svg className="animate-spin shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : domainStatus === "active" ? (
                      <svg className="shrink-0 mt-0.5 text-emerald-500" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className={`shrink-0 mt-0.5 ${domainStatus === "error" ? "text-red-500" : "text-amber-500"}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        domainStatus === "active" ? "text-emerald-700 dark:text-emerald-400"
                        : domainStatus === "error" ? "text-red-700 dark:text-red-400"
                        : domainStatus === "checking" ? "text-black/50 dark:text-white/50"
                        : "text-amber-700 dark:text-amber-400"
                      }`}>
                        {domainStatus === "active" ? "Connected" : domainStatus === "checking" ? "Checking..." : domainStatus === "error" ? "Error" : "Pending DNS"}
                      </p>
                      {domainStatusMsg && <p className="text-black/40 dark:text-white/40 mt-0.5">{domainStatusMsg}</p>}
                    </div>
                    {domainStatus !== "checking" && domainStatus !== "active" && (
                      <button
                        onClick={() => checkDomainStatus(customDomain)}
                        className="shrink-0 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors underline underline-offset-2"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {/* DNS setup instructions - shown until domain is active */}
                {customDomain && domainStatus !== "active" && (
                  <div className="rounded-lg bg-black/4 dark:bg-white/4 p-3 flex flex-col gap-2 text-xs">
                    <p className="font-medium text-black/70 dark:text-white/70">Step 1 - Add a CNAME record at your DNS provider</p>
                    {[
                      { label: "Type", value: "CNAME" },
                      { label: "Name", value: customDomain.split(".").length > 2 ? customDomain.split(".")[0] : "@" },
                      { label: "Value", value: "cname.vercel-dns.com" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-black/40 dark:text-white/40 w-10 shrink-0">{label}</span>
                        <span className="font-mono text-black dark:text-white flex-1 truncate">{value}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(value)}
                          className="shrink-0 text-black/25 dark:text-white/25 hover:text-black dark:hover:text-white transition-colors"
                          title="Copy"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    <p className="text-black/30 dark:text-white/30 pt-1">Step 2 - DNS changes can take a few minutes to 48 hours to propagate.</p>
                    <button
                      onClick={() => checkDomainStatus(customDomain)}
                      disabled={domainStatus === "checking"}
                      className="mt-1 self-start flex h-7 items-center rounded-md bg-black/8 dark:bg-white/8 px-3 text-xs font-medium text-black dark:text-white hover:bg-black/12 dark:hover:bg-white/12 transition-colors disabled:opacity-50"
                    >
                      {domainStatus === "checking" ? "Checking..." : "Check status"}
                    </button>
                  </div>
                )}

                {/* Active domain - show quick link */}
                {customDomain && domainStatus === "active" && (
                  <a
                    href={`https://${customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Visit {customDomain}
                  </a>
                )}
              </div>
            </Section>
          </>
        )}

        {tab === "analytics" && (
          <>
            <AnalyticsTab links={data.links} />
            <Section
              title="Pixels"
              action={
                <div className="flex items-center gap-2">
                  <span className={`text-xs transition-all duration-300 ${pixelSaved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                  <button
                    onClick={async () => {
                      setPixelSaving(true);
                      await fetch("/api/admin/pixels", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ metaPixelId, tiktokPixelId, googleTagId }),
                      });
                      setPixelSaving(false);
                      setPixelSaved(true);
                      setTimeout(() => setPixelSaved(false), 2000);
                    }}
                    disabled={pixelSaving}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {pixelSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">
                  Paste your pixel or tag IDs below. They fire on every visit to your profile — no code needed.
                </p>
                {[
                  { label: "Meta (Facebook) Pixel ID", value: metaPixelId, set: setMetaPixelId, placeholder: "1234567890123456" },
                  { label: "TikTok Pixel ID", value: tiktokPixelId, set: setTiktokPixelId, placeholder: "CXXXXXXXXXXXXXXXXX" },
                  { label: "Google Tag ID", value: googleTagId, set: setGoogleTagId, placeholder: "G-XXXXXXXXXX or AW-XXXXXXXXXX" },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">{label}</label>
                    <input
                      className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors font-mono"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </Section>
            <Section
              title="Webhooks / Zapier"
              action={
                <div className="flex items-center gap-2">
                  <span className={`text-xs transition-all duration-300 ${webhookSaved ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
                  <button
                    onClick={async () => {
                      setWebhookSaving(true);
                      await fetch("/api/admin/webhook", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ webhookUrl }),
                      });
                      setWebhookSaving(false);
                      setWebhookSaved(true);
                      setTimeout(() => setWebhookSaved(false), 2000);
                    }}
                    disabled={webhookSaving}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
                  >
                    {webhookSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">
                  Add a webhook URL and we&apos;ll POST a JSON payload whenever a new subscriber, booking, tip, or order comes in. Works with Zapier, Make, n8n, and any HTTP endpoint.
                </p>
                <div className="flex gap-2">
                  <input
                    className="h-8 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors font-mono"
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); setWebhookTestResult(null); }}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                  <button
                    disabled={!webhookUrl.trim() || webhookTesting}
                    onClick={async () => {
                      setWebhookTesting(true);
                      setWebhookTestResult(null);
                      try {
                        await fetch(webhookUrl, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ event: "test", timestamp: new Date().toISOString(), data: { message: "TriLink webhook test" } }),
                        });
                        setWebhookTestResult("ok");
                      } catch {
                        setWebhookTestResult("error");
                      }
                      setWebhookTesting(false);
                    }}
                    className="flex h-8 items-center rounded-lg border border-black/10 dark:border-white/10 px-3 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
                  >
                    {webhookTesting ? "Sending…" : "Test"}
                  </button>
                </div>
                {webhookTestResult === "ok" && (
                  <p className="text-xs text-emerald-500">Test sent — check your endpoint for the payload.</p>
                )}
                {webhookTestResult === "error" && (
                  <p className="text-xs text-red-500">Request failed — check the URL and try again.</p>
                )}
                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3 text-[11px] text-black/50 dark:text-white/50 flex flex-col gap-1.5">
                  <p className="font-medium text-black/60 dark:text-white/60">Events fired:</p>
                  {[
                    { event: "subscriber.created", desc: "New email subscriber" },
                    { event: "booking.created", desc: "New booking confirmed" },
                    { event: "tip.received", desc: "Tip payment completed" },
                    { event: "order.paid", desc: "Digital product purchased" },
                  ].map(({ event, desc }) => (
                    <div key={event} className="flex items-center gap-2">
                      <span className="font-mono text-black/40 dark:text-white/40">{event}</span>
                      <span className="text-black/25 dark:text-white/25">—</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === "booking" && data.profile && (
          <BookingTab profile={data.profile} username={username ?? ""} />
        )}

        {tab === "store" && data.profile && (
          <StoreTab profile={data.profile} username={username ?? ""} />
        )}

      </main>

      {showQR && username && (
        <QRModal username={username} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}

// ── Booking Tab ──────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATION_OPTIONS = [15, 30, 45, 60];
const BUFFER_OPTIONS = [0, 5, 10, 15];
const ADVANCE_OPTIONS = [7, 14, 30, 60, 90];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Vancouver", "America/Toronto", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam", "Europe/Rome", "Europe/Madrid",
  "Europe/Athens", "Europe/Moscow", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata",
  "Asia/Dhaka", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul",
  "Asia/Shanghai", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
];

type AvailabilityWindow = { dayOfWeek: number; startTime: string; endTime: string };
type BookingRecord = {
  id: string; guestName: string; guestEmail: string; notes: string;
  startsAt: string; endsAt: string; status: string; guestTimezone: string;
};

function BookingTab({ profile, username }: { profile: import("@/data/links").Profile; username: string }) {
  const [enabled, setEnabled] = useState(profile.bookingEnabled ?? false);
  const [title, setTitle] = useState(profile.bookingTitle ?? "Book a call");
  const [duration, setDuration] = useState(profile.bookingDuration ?? 30);
  const [buffer, setBuffer] = useState(profile.bookingBuffer ?? 0);
  const [advanceDays, setAdvanceDays] = useState(profile.bookingAdvanceDays ?? 30);
  const [email, setEmail] = useState(profile.bookingEmail ?? "");
  const [timezone, setTimezone] = useState(profile.bookingTimezone ?? "UTC");
  const [smsNumber, setSmsNumber] = useState(profile.bookingSmsNumber ?? "");
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [bookingsList, setBookingsList] = useState<BookingRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    setLoadingBookings(true);
    fetch("/api/admin/bookings")
      .then((r) => r.json())
      .then((d) => {
        setWindows(d.availability || []);
        setBookingsList(d.bookings || []);
      })
      .finally(() => setLoadingBookings(false));
  }, []);

  const toggleDay = (dow: number) => {
    const existing = windows.filter((w) => w.dayOfWeek === dow);
    if (existing.length > 0) {
      setWindows((prev) => prev.filter((w) => w.dayOfWeek !== dow));
    } else {
      setWindows((prev) => [...prev, { dayOfWeek: dow, startTime: "09:00", endTime: "17:00" }]);
    }
  };

  const updateWindow = (dow: number, field: "startTime" | "endTime", val: string) => {
    setWindows((prev) => prev.map((w) => w.dayOfWeek === dow ? { ...w, [field]: val } : w));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: { enabled, title, duration, buffer, advanceDays, email, timezone, smsNumber },
        windows,
      }),
    });
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const cancelBooking = async (id: string) => {
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setBookingsList((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
  };

  const upcoming = bookingsList.filter((b) => b.status === "confirmed" && new Date(b.startsAt) > new Date());
  const past = bookingsList.filter((b) => b.status !== "confirmed" || new Date(b.startsAt) <= new Date());

  const inputClass = "h-8 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors";
  const selectClass = inputClass + " pr-6";

  function formatBookingTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Enable toggle */}
      <Section
        title="Booking"
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-all duration-300 ${savedMsg ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Enable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black dark:text-white">Enable booking page</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                {enabled && username ? (
                  <a href={`/book/${username}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    /book/{username}
                  </a>
                ) : "Guests can book time directly from your profile"}
              </p>
            </div>
            <button
              onClick={() => setEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {enabled && (
            <>
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Booking title</label>
                <input
                  className={inputClass + " w-full"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Book a call"
                />
              </div>

              {/* Duration + Buffer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Duration</label>
                  <select className={selectClass + " w-full"} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Buffer between</label>
                  <select className={selectClass + " w-full"} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))}>
                    {BUFFER_OPTIONS.map((b) => <option key={b} value={b}>{b === 0 ? "None" : `${b} min`}</option>)}
                  </select>
                </div>
              </div>

              {/* Advance days + timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Book up to</label>
                  <select className={selectClass + " w-full"} value={advanceDays} onChange={(e) => setAdvanceDays(Number(e.target.value))}>
                    {ADVANCE_OPTIONS.map((d) => <option key={d} value={d}>{d} days out</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Timezone</label>
                  <select className={selectClass + " w-full"} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              {/* Notification email + SMS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Notification email</label>
                  <input
                    type="email"
                    className={inputClass + " w-full"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">SMS number (host)</label>
                  <input
                    type="tel"
                    className={inputClass + " w-full"}
                    value={smsNumber}
                    onChange={(e) => setSmsNumber(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Availability grid */}
      {enabled && (
        <Section title="Availability">
          <div className="flex flex-col gap-2">
            {DAY_LABELS.map((label, dow) => {
              const win = windows.find((w) => w.dayOfWeek === dow);
              const active = !!win;
              return (
                <div key={dow} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDay(dow)}
                    className={`w-10 text-xs font-medium rounded-md px-1 py-1 transition-colors ${
                      active
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "border border-black/10 dark:border-white/10 text-black/30 dark:text-white/30"
                    }`}
                  >
                    {label}
                  </button>
                  {active && win ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={win.startTime}
                        onChange={(e) => updateWindow(dow, "startTime", e.target.value)}
                        className={inputClass}
                      />
                      <span className="text-xs text-black/30 dark:text-white/30">–</span>
                      <input
                        type="time"
                        value={win.endTime}
                        onChange={(e) => updateWindow(dow, "endTime", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-black/20 dark:text-white/20">Unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Upcoming bookings */}
      {enabled && (
        <Section title={`Upcoming (${upcoming.length})`}>
          {loadingBookings ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 py-2">No upcoming bookings.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((b) => (
                <div key={b.id} className="rounded-lg border border-black/8 dark:border-white/8 p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">{b.guestName}</p>
                    <p className="text-xs text-black/40 dark:text-white/40 truncate">{b.guestEmail}</p>
                    <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{formatBookingTime(b.startsAt)}</p>
                    {b.notes && <p className="text-xs text-black/30 dark:text-white/30 mt-1 italic">{b.notes}</p>}
                  </div>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    className="shrink-0 text-[10px] text-red-400 hover:text-red-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Past / cancelled */}
      {enabled && past.length > 0 && (
        <Section title={`Past & cancelled (${past.length})`}>
          <div className="flex flex-col gap-2">
            {past.slice(0, 10).map((b) => (
              <div key={b.id} className="rounded-lg border border-black/5 dark:border-white/5 p-3 opacity-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-black dark:text-white">{b.guestName}</p>
                  {b.status === "cancelled" && (
                    <span className="text-[10px] text-red-400">Cancelled</span>
                  )}
                </div>
                <p className="text-xs text-black/40 dark:text-white/40">{formatBookingTime(b.startsAt)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Embed widget */}
      {enabled && username && (
        <EmbedSnippet username={username} />
      )}
    </div>
  );
}

function EmbedSnippet({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://trilink-nine-neon.vercel.app";
  const snippet = `<iframe\n  src="${origin}/embed/book/${username}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e5e7eb;"\n></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Section title="Embed widget">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-black/50 dark:text-white/50">
          Paste this snippet anywhere on your website to embed the booking calendar directly.
        </p>
        <div className="relative rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/8 dark:border-white/8 p-3">
          <pre className="text-[11px] text-black/60 dark:text-white/60 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {snippet}
          </pre>
          <button
            onClick={copy}
            className="absolute top-2.5 right-2.5 flex h-7 items-center gap-1.5 rounded-md bg-white dark:bg-black border border-black/10 dark:border-white/10 px-2.5 text-[11px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-black/30 dark:text-white/30">
          The widget auto-sizes to its container. Set height to at least 600px for the best experience.
        </p>
      </div>
    </Section>
  );
}

// ── Store Tab ─────────────────────────────────────────────────────────────────

type ProductRow = {
  id: string; title: string; description: string; price: number;
  currency: string; fileUrl: string; coverUrl: string; active: boolean;
};
type SubscriberRow = { id: string; email: string; name: string; subscribedAt: string | null };

function StoreTab({ profile, username }: { profile: import("@/data/links").Profile; username: string }) {
  // Stripe keys state
  const [stripePublishableKey, setStripePublishableKey] = useState(profile.stripePublishableKey ?? "");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeSecretKeySet, setStripeSecretKeySet] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeSavedMsg, setStripeSavedMsg] = useState(false);
  const [stripeError, setStripeError] = useState("");

  // Email capture state
  const [emailEnabled, setEmailEnabled] = useState(profile.emailCaptureEnabled ?? false);
  const [emailTitle, setEmailTitle] = useState(profile.emailCaptureTitle ?? "Stay in the loop");
  const [emailButton, setEmailButton] = useState(profile.emailCaptureButtonText ?? "Subscribe");
  const [tipEnabled, setTipEnabled] = useState(profile.tipJarEnabled ?? false);
  const [tipTitle, setTipTitle] = useState(profile.tipJarTitle ?? "Support my work");
  const [tipAmounts, setTipAmounts] = useState(profile.tipJarAmounts ?? "3,5,10,25");
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // Products state
  const [prods, setProds] = useState<ProductRow[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products").then((r) => r.json()).then((d) => {
      setProds((d.products || []).map((p: ProductRow & { price: number }) => ({
        ...p, price: p.price / 100,
      })));
      setLoadingProds(false);
    });
    fetch("/api/admin/subscribers").then((r) => r.json()).then((d) => {
      setSubscribers(d.subscribers || []);
      setLoadingSubs(false);
    });
    fetch("/api/admin/stripe-keys").then((r) => r.json()).then((d) => {
      if (d.publishableKey) setStripePublishableKey(d.publishableKey);
      setStripeSecretKeySet(!!d.secretKeySet);
    });
  }, []);

  function genId() { return Math.random().toString(36).slice(2, 9); }

  function addProduct() {
    setProds((prev) => [...prev, {
      id: genId(), title: "New Product", description: "", price: 9.99,
      currency: "usd", fileUrl: "", coverUrl: "", active: true,
    }]);
  }

  function updateProd(id: string, field: string, value: string | boolean | number) {
    setProds((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  }

  function deleteProd(id: string) {
    setProds((prev) => prev.filter((p) => p.id !== id));
  }

  function moveProd(id: string, dir: -1 | 1) {
    const arr = [...prods];
    const idx = arr.findIndex((p) => p.id === id);
    const next = idx + dir;
    if (next < 0 || next >= arr.length) return;
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setProds(arr);
  }

  async function handleSaveStripeKeys() {
    setStripeError("");
    setSavingStripe(true);
    const res = await fetch("/api/admin/stripe-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishableKey: stripePublishableKey, secretKey: stripeSecretKey }),
    });
    const data = await res.json();
    setSavingStripe(false);
    if (!res.ok) { setStripeError(data.error || "Failed to save"); return; }
    if (stripeSecretKey) setStripeSecretKeySet(true);
    setStripeSecretKey("");
    setStripeSavedMsg(true);
    setTimeout(() => setStripeSavedMsg(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: prods }),
      }),
      fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailCaptureEnabled: emailEnabled,
          emailCaptureTitle: emailTitle,
          emailCaptureButtonText: emailButton,
          tipJarEnabled: tipEnabled,
          tipJarTitle: tipTitle,
          tipJarAmounts: tipAmounts,
        }),
      }),
    ]);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  function exportCSV() {
    const header = "email,name,subscribed_at\n";
    const rows = subscribers.map((s) =>
      `"${s.email}","${s.name}","${s.subscribedAt ?? ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteSubscriber(id: string) {
    await fetch("/api/admin/subscribers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
  }

  const inputClass = "h-8 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* Stripe keys section */}
      <Section
        title="Payments"
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-all duration-300 ${stripeSavedMsg ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
            <button
              onClick={handleSaveStripeKeys}
              disabled={savingStripe}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
            >
              {savingStripe ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-black/40 dark:text-white/40">
            Paste your Stripe API keys — payments go directly to your account. Get them from{" "}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">dashboard.stripe.com/apikeys</a>.
          </p>
          {stripeError && <p className="text-xs text-red-500">{stripeError}</p>}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Publishable key (pk_…)</label>
              <input
                className={inputClass + " w-full font-mono"}
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
                placeholder="pk_live_..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                Secret key (sk_…){stripeSecretKeySet && <span className="ml-1.5 text-emerald-500">✓ set</span>}
              </label>
              <input
                type="password"
                className={inputClass + " w-full font-mono"}
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder={stripeSecretKeySet ? "Leave blank to keep existing" : "sk_live_..."}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Products section */}
      <Section
        title="Products"
        action={
          <div className="flex items-center gap-3">
            <span className={`text-xs transition-all duration-300 ${savedMsg ? "text-emerald-500" : "opacity-0"}`}>Saved</span>
            <button
              onClick={addProduct}
              className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              <span className="text-base leading-none">+</span> Add product
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {loadingProds ? (
          <div className="flex justify-center py-4">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
        ) : prods.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30 text-center py-2">
            No products yet. Add one above to start selling digital downloads.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {prods.map((p, i) => (
              <div key={p.id} className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveProd(p.id, -1)} disabled={i === 0} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L9 7H1L5 2Z" fill="currentColor" /></svg>
                    </button>
                    <button onClick={() => moveProd(p.id, 1)} disabled={i === prods.length - 1} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3H9L5 8Z" fill="currentColor" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      className={inputClass + " w-full"}
                      value={p.title}
                      onChange={(e) => updateProd(p.id, "title", e.target.value)}
                      placeholder="Product name"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-black/30 dark:text-white/30">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass + " w-full"}
                        value={p.price}
                        onChange={(e) => updateProd(p.id, "price", parseFloat(e.target.value) || 0)}
                        placeholder="9.99"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => updateProd(p.id, "active", !p.active)}
                    className={`shrink-0 text-[10px] px-2 py-1 rounded-md transition-colors ${p.active ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-black/5 dark:bg-white/5 text-black/30 dark:text-white/30"}`}
                  >
                    {p.active ? "Active" : "Hidden"}
                  </button>
                  <button onClick={() => deleteProd(p.id)} className="shrink-0 text-black/20 hover:text-red-400 dark:text-white/20 dark:hover:text-red-400 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <input
                  className={inputClass + " w-full"}
                  value={p.description}
                  onChange={(e) => updateProd(p.id, "description", e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Digital file</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        className={inputClass + " w-full min-w-0"}
                        value={p.fileUrl}
                        onChange={(e) => updateProd(p.id, "fileUrl", e.target.value)}
                        placeholder={p.fileUrl ? undefined : "No file uploaded"}
                        readOnly={!!p.fileUrl}
                      />
                      <label className="shrink-0 flex h-8 items-center gap-1 rounded-md border border-black/10 dark:border-white/10 px-2 text-[11px] text-black/50 dark:text-white/50 cursor-pointer hover:border-black/25 dark:hover:border-white/25 hover:text-black dark:hover:text-white transition-colors">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        {p.fileUrl ? "Replace" : "Upload"}
                        <input
                          type="file"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            updateProd(p.id, "fileUrl", "uploading...");
                            const form = new FormData();
                            form.append("file", file);
                            form.append("purpose", "product-file");
                            const res = await fetch("/api/upload", { method: "POST", body: form });
                            const { url } = await res.json();
                            updateProd(p.id, "fileUrl", url);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Cover image</label>
                    <div className="flex gap-1.5 items-center">
                      {p.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0 border border-black/8 dark:border-white/8" />
                      )}
                      <label className="shrink-0 flex h-8 items-center gap-1 rounded-md border border-black/10 dark:border-white/10 px-2 text-[11px] text-black/50 dark:text-white/50 cursor-pointer hover:border-black/25 dark:hover:border-white/25 hover:text-black dark:hover:text-white transition-colors">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        {p.coverUrl ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            updateProd(p.id, "coverUrl", "uploading...");
                            const form = new FormData();
                            form.append("file", file);
                            form.append("purpose", "product-cover");
                            const res = await fetch("/api/upload", { method: "POST", body: form });
                            const { url } = await res.json();
                            updateProd(p.id, "coverUrl", url);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {p.coverUrl && (
                        <button
                          onClick={() => updateProd(p.id, "coverUrl", "")}
                          className="text-[10px] text-black/25 dark:text-white/25 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Email capture section */}
      <Section title="Email List">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black dark:text-white">Email capture widget</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                {emailEnabled && username ? (
                  <>Shows on <a href={`/${username}`} target="_blank" className="underline underline-offset-2">your profile</a></>
                ) : "Show a subscribe box on your profile"}
              </p>
            </div>
            <button
              onClick={() => setEmailEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${emailEnabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${emailEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          {emailEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Heading</label>
                <input className={inputClass + " w-full"} value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} placeholder="Stay in the loop" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Button text</label>
                <input className={inputClass + " w-full"} value={emailButton} onChange={(e) => setEmailButton(e.target.value)} placeholder="Subscribe" />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Tip Jar */}
      <Section title="Tip Jar">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black dark:text-white">Tip jar widget</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                {tipEnabled && username ? (
                  <>Shows on <a href={`/${username}`} target="_blank" className="underline underline-offset-2">your profile</a></>
                ) : "Let visitors send you a tip via Stripe"}
              </p>
            </div>
            <button
              onClick={() => setTipEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${tipEnabled ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-transform ${tipEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          {tipEnabled && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Heading</label>
                <input className={inputClass + " w-full"} value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} placeholder="Support my work" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Preset amounts (comma-separated, USD)</label>
                <input className={inputClass + " w-full"} value={tipAmounts} onChange={(e) => setTipAmounts(e.target.value)} placeholder="3,5,10,25" />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Subscribers list */}
      <Section
        title={`Subscribers (${subscribers.length})`}
        action={
          subscribers.length > 0 ? (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              Export CSV
            </button>
          ) : undefined
        }
      >
        {loadingSubs ? (
          <div className="flex justify-center py-4">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
        ) : subscribers.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30 text-center py-2">No subscribers yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-black dark:text-white truncate">{s.email}</p>
                  {s.name && <p className="text-[10px] text-black/40 dark:text-white/40">{s.name}</p>}
                </div>
                <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0">
                  {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </span>
                <button
                  onClick={() => deleteSubscriber(s.id)}
                  className="shrink-0 text-black/15 hover:text-red-400 dark:text-white/15 dark:hover:text-red-400 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

function AnalyticsTab({ links }: { links: Link[] }) {
  const [days, setDays] = useState<7 | 14>(14);
  const [localStats, setLocalStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?days=${days}`)
      .then((r) => r.json())
      .then((s) => { setLocalStats(s); setLoading(false); });
  }, [days]);

  if (loading || !localStats) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs text-black/30 dark:text-white/30">Loading analytics...</span>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayViews = localStats.viewsByDay.find((d) => d.date === today)?.count ?? 0;
  const totalClicks = localStats.clicksByDay.reduce((a, b) => a + b.count, 0);
  const totalRangeViews = localStats.viewsByDay.reduce((a, b) => a + b.count, 0);
  const rangeLabel = `Last ${days} days`;

  const bestDayLabel = localStats.bestDay
    ? new Date(localStats.bestDay.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  const rankedLinks = links
    .filter((l) => l.type !== "header" && l.type !== "embed" && l.type !== "booking" && l.type !== "countdown" && l.type !== "rss")
    .map((l) => ({ id: l.id, title: l.title, count: localStats.byLink[l.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const maxLinkClicks = Math.max(...rankedLinks.map((l) => l.count), 1);

  // Device totals
  const totalDevices = localStats.devices.reduce((a, b) => a + b.count, 0) || 1;
  const deviceMap: Record<string, number> = {};
  for (const d of localStats.devices) deviceMap[d.device] = d.count;

  const maxReferrer = Math.max(...(localStats.referrers.map((r) => r.count)), 1);
  const maxCountry = Math.max(...(localStats.countries.map((c) => c.count)), 1);

  return (
    <div className="flex flex-col gap-8">
      {/* Range toggle */}
      <div className="flex items-center justify-end gap-1">
        {(([7, 14] as const)).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              days === d
                ? "bg-black/8 dark:bg-white/8 text-black dark:text-white"
                : "text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Profile views" value={totalRangeViews.toLocaleString()} sub={rangeLabel} />
        <StatCard label="Link clicks" value={totalClicks.toLocaleString()} sub={rangeLabel} />
        <StatCard label="Today" value={todayViews.toLocaleString()} sub="Views" />
        <StatCard
          label="Best day"
          value={localStats.bestDay ? localStats.bestDay.count.toLocaleString() : "—"}
          sub={bestDayLabel}
        />
      </div>

      {/* Views chart */}
      <Section title={`Profile Views — ${rangeLabel}`}>
        <BarChart data={localStats.viewsByDay} today={today} />
      </Section>

      {/* Clicks chart */}
      <Section title={`Link Clicks — ${rangeLabel}`}>
        <BarChart data={localStats.clicksByDay} today={today} dim />
      </Section>

      {/* Referrers + Devices side by side */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Top referrers */}
        <Section title="Top Sources">
          {localStats.referrers.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 py-2">No data yet</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {localStats.referrers.map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="text-xs text-black/60 dark:text-white/60 w-24 shrink-0 truncate">{r.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-black/30 dark:bg-white/30 transition-all" style={{ width: `${(r.count / maxReferrer) * 100}%` }} />
                  </div>
                  <span className="text-xs text-black/40 dark:text-white/40 w-8 text-right shrink-0">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Device breakdown */}
        <Section title="Devices">
          {localStats.devices.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 py-2">No data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(["mobile", "desktop", "tablet"] as const).map((type) => {
                const count = deviceMap[type] ?? 0;
                const pct = Math.round((count / totalDevices) * 100);
                const icons = {
                  mobile: <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />,
                  desktop: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" /></>,
                  tablet: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" /></>,
                };
                return (
                  <div key={type} className="flex items-center gap-3">
                    <svg className="shrink-0 text-black/30 dark:text-white/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      {icons[type]}
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs capitalize text-black/60 dark:text-white/60">{type}</span>
                        <span className="text-xs text-black/40 dark:text-white/40">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-black/25 dark:bg-white/25 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Countries */}
      {localStats.countries.length > 0 && (
        <Section title="Top Countries">
          <div className="grid grid-cols-2 gap-2">
            {localStats.countries.map((c) => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-base leading-none">{countryFlag(c.country)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-black/60 dark:text-white/60 truncate">{c.country}</span>
                    <span className="text-xs text-black/40 dark:text-white/40 ml-1 shrink-0">{c.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-black/20 dark:bg-white/20" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Link performance */}
      <Section title="Link Performance (All Time)">
        {rankedLinks.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30 text-center py-2">No links yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rankedLinks.map((link, i) => {
              const ctr = localStats.totalViews > 0 ? (link.count / localStats.totalViews) * 100 : 0;
              return (
                <div key={link.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-black/20 dark:text-white/20 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-black/70 dark:text-white/70 truncate">{link.title || "Untitled"}</span>
                      <div className="flex items-center gap-2.5 ml-2 shrink-0">
                        <span className="text-[10px] text-black/25 dark:text-white/25">{ctr.toFixed(1)}% CTR</span>
                        <span className="text-xs text-black/40 dark:text-white/40">{link.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-black/25 dark:bg-white/25 transition-all" style={{ width: `${(link.count / maxLinkClicks) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <TrackableLinksSection />

      <p className="text-center text-[11px] text-black/20 dark:text-white/20">
        CTR = link clicks / total profile views. Data updates in real time.
      </p>
    </div>
  );
}

function TrackableLinksSection() {
  type TrackedLink = { id: string; name: string; destinationUrl: string; clicks: number };
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const appHost = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/admin/tracked-links")
      .then((r) => r.json())
      .then((d) => { setLinks(d.links ?? []); setLoading(false); });
  }, []);

  async function create() {
    if (!name.trim() || !url.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/tracked-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, destinationUrl: url }),
    });
    const d = await res.json();
    if (res.ok) {
      setLinks((prev) => [...prev, { ...d }]);
      setName("");
      setUrl("");
    }
    setCreating(false);
  }

  async function remove(id: string) {
    await fetch("/api/admin/tracked-links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function copy(id: string) {
    navigator.clipboard.writeText(`${appHost}/t/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const maxClicks = Math.max(...links.map((l) => l.clicks), 1);

  return (
    <Section
      title="Trackable Links"
      action={<span className="text-[10px] text-black/30 dark:text-white/30">Named short links with click tracking</span>}
    >
      <div className="flex flex-col gap-4">
        {/* Create form */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="h-8 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              placeholder="Name (e.g. Instagram Bio)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="h-8 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              placeholder="Destination URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              onClick={create}
              disabled={creating || !name.trim() || !url.trim()}
              className="flex h-8 items-center rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black transition-opacity disabled:opacity-40"
            >
              {creating ? "..." : "Create"}
            </button>
          </div>
        </div>

        {/* Links list */}
        {loading ? (
          <p className="text-xs text-black/30 dark:text-white/30">Loading...</p>
        ) : links.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30">No trackable links yet. Create one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <div key={link.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-black/70 dark:text-white/70 truncate">{link.name}</span>
                      <span className="text-xs text-black/40 dark:text-white/40 ml-2 shrink-0">{link.clicks.toLocaleString()} clicks</span>
                    </div>
                    <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-black/20 dark:bg-white/20 transition-all" style={{ width: `${(link.clicks / maxClicks) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-black/30 dark:text-white/30 truncate flex-1">{appHost}/t/{link.id}</span>
                  <button
                    onClick={() => copy(link.id)}
                    className="shrink-0 flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {copied === link.id ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                    {copied === link.id ? "Copied" : "Copy"}
                  </button>
                  <span className="text-black/10 dark:text-white/10">|</span>
                  <span className="text-[10px] text-black/25 dark:text-white/25 truncate max-w-[120px]">{link.destinationUrl}</span>
                  <button
                    onClick={() => remove(link.id)}
                    className="shrink-0 text-[10px] text-black/20 dark:text-white/20 hover:text-red-400 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function BarChart({ data, today, dim = false }: { data: Array<{ date: string; count: number }>; today: string; dim?: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;

  // Label cadence: show all for 7d, every other for 14d, every 5th for 30d
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : 5;
  const gap = n >= 20 ? "gap-0.5" : "gap-1.5";

  return (
    <div className={`flex items-end ${gap} h-28 pt-2`}>
      {data.map((d, i) => {
        const height = d.count === 0 ? 2 : Math.max(8, Math.round((d.count / max) * 96));
        const isToday = d.date === today;
        const isHovered = hoveredIndex === i;
        // Show label at regular cadence, always show today and first/last
        const showLabel = i === 0 || i === n - 1 || isToday || i % labelEvery === 0;
        const label = d.date.slice(5).replace("-", "/");
        return (
          <div
            key={d.date}
            className="relative flex-1 flex flex-col items-center gap-1"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {isHovered && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none shadow-sm">
                {label} · {d.count.toLocaleString()}
              </div>
            )}
            <div
              className={`w-full rounded-sm transition-all ${
                isToday
                  ? dim ? "bg-black/40 dark:bg-white/40" : "bg-black dark:bg-white"
                  : dim ? "bg-black/8 dark:bg-white/8" : "bg-black/15 dark:bg-white/15"
              }`}
              style={{ height: `${height}px` }}
            />
            <span className={`text-[8px] leading-none ${showLabel ? (isToday ? "text-black/50 dark:text-white/50" : "text-black/20 dark:text-white/20") : "text-transparent"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-0.5">
      <span className="text-2xl font-semibold text-black dark:text-white tracking-tight">{value}</span>
      <span className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wider">{label}</span>
      {sub && <span className="text-[10px] text-black/20 dark:text-white/20 mt-0.5">{sub}</span>}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-black/30 dark:text-white/30">
          {title}
        </h2>
        {action}
      </div>
      <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 text-sm text-black dark:text-white placeholder-black/20 dark:placeholder-white/20 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
    />
  );
}

function Textarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-black/20 dark:placeholder-white/20 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-y"
    />
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
    >
      {ICONS.map((icon) => (
        <option key={icon} value={icon}>
          {icon}
        </option>
      ))}
    </select>
  );
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getScheduleStatus(link: Link): "scheduled" | "active" | "expired" | null {
  const now = new Date();
  if (!link.startsAt && !link.endsAt) return null;
  if (link.endsAt && new Date(link.endsAt) < now) return "expired";
  if (link.startsAt && new Date(link.startsAt) > now) return "scheduled";
  return "active";
}

function LinkRow({
  link,
  clickCount,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}: {
  link: Link;
  clickCount: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const scheduleStatus = getScheduleStatus(link);
  const hasSchedule = !!(link.startsAt || link.endsAt);

  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2L1 7h8L5 2z" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 8L1 3h8L5 8z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="flex-1 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input value={link.title} onChange={(v) => onChange("title", v)} placeholder="Title" />
          <Input value={link.url} onChange={(v) => onChange("url", v)} placeholder="https://" />
          <IconSelect value={link.icon ?? "globe"} onChange={(v) => onChange("icon", v)} />
        </div>

        <button
          onClick={onDelete}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="pl-7 flex items-center gap-2">
        <Input value={link.description ?? ""} onChange={(v) => onChange("description", v)} placeholder="Description (optional)" />
        <span className="shrink-0 flex items-center gap-1 text-[11px] text-black/30 dark:text-white/30 whitespace-nowrap">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {clickCount.toLocaleString()}
        </span>
      </div>

      {/* Schedule toggle row */}
      <div className="pl-7 flex items-center gap-2">
        <button
          onClick={() => setShowSchedule((s) => !s)}
          className={`flex items-center gap-1 text-[11px] transition-colors ${
            hasSchedule
              ? "text-black/50 dark:text-white/50"
              : "text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50"
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Schedule
        </button>
        {scheduleStatus === "scheduled" && (
          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">Scheduled</span>
        )}
        {scheduleStatus === "active" && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Active</span>
        )}
        {scheduleStatus === "expired" && (
          <span className="text-[10px] bg-black/8 dark:bg-white/8 text-black/30 dark:text-white/30 px-1.5 py-0.5 rounded-full font-medium">Expired</span>
        )}
      </div>

      {showSchedule && (
        <div className="pl-7 flex flex-col gap-2 border-t border-black/5 dark:border-white/5 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-black/30 dark:text-white/30 uppercase tracking-wider">Show after</label>
              <input
                type="datetime-local"
                value={toDatetimeLocal(link.startsAt)}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange("startsAt", v ? new Date(v).toISOString() : null);
                }}
                className="h-8 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-black/30 dark:text-white/30 uppercase tracking-wider">Hide after</label>
              <input
                type="datetime-local"
                value={toDatetimeLocal(link.endsAt)}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange("endsAt", v ? new Date(v).toISOString() : null);
                }}
                className="h-8 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              />
            </div>
          </div>
          {hasSchedule && (
            <button
              onClick={() => { onChange("startsAt", null); onChange("endsAt", null); }}
              className="self-start text-[10px] text-black/25 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear schedule
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmbedRow({
  link,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}: {
  link: Link;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const platform = getEmbedPlatform(link.url);
  const platformLabel: Record<string, string> = { youtube: "YouTube", spotify: "Spotify", tweet: "Tweet" };

  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor" /></svg>
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor" /></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input value={link.url} onChange={(v) => onChange("url", v)} placeholder="Paste Spotify, YouTube, or tweet URL" />
            {platform ? (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/8 dark:bg-white/8 text-black/50 dark:text-white/50">
                {platformLabel[platform]}
              </span>
            ) : link.url ? (
              <span className="shrink-0 text-[10px] text-red-500/60 dark:text-red-400/60">unrecognized</span>
            ) : null}
          </div>
          <Input value={link.title} onChange={(v) => onChange("title", v)} placeholder="Label (optional)" />
        </div>

        <button
          onClick={onDelete}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function BookingWidgetRow({
  isFirst,
  isLast,
  onDelete,
  onMove,
}: {
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black px-3 py-2.5 flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(-1)} disabled={isFirst} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L9 7H1L5 2Z" fill="currentColor" /></svg>
        </button>
        <button onClick={() => onMove(1)} disabled={isLast} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3H9L5 8Z" fill="currentColor" /></svg>
        </button>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-black dark:text-white">Booking calendar</p>
          <p className="text-[10px] text-black/30 dark:text-white/30">Inline widget — uses your Booking tab settings</p>
        </div>
      </div>
      <button onClick={onDelete} className="shrink-0 text-black/20 hover:text-red-400 dark:text-white/20 dark:hover:text-red-400 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function CountdownRow({
  link,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}: {
  link: Link;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  // url stores the ISO end-datetime; title is the label; description is optional subtitle
  function toDatetimeLocalValue(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMove(-1)} disabled={isFirst} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor" /></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={isLast} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor" /></svg>
          </button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input value={link.title} onChange={(v) => onChange("title", v)} placeholder="Label (e.g. Sale ends)" />
            <div className="flex flex-col gap-1">
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(link.url)}
                onChange={(e) => onChange("url", e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="h-8 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-2 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              />
            </div>
          </div>
          <Input value={link.description ?? ""} onChange={(v) => onChange("description", v)} placeholder="Subtitle (optional)" />
        </div>
        <button onClick={onDelete} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>
  );
}

function RssRow({
  link,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}: {
  link: Link;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  // url stores the RSS feed URL; title is a custom label (uses feed item title if empty)
  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMove(-1)} disabled={isFirst} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor" /></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={isLast} className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor" /></svg>
          </button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <Input value={link.url} onChange={(v) => onChange("url", v)} placeholder="RSS feed URL (e.g. https://blog.com/feed.xml)" />
          <Input value={link.title} onChange={(v) => onChange("title", v)} placeholder="Label — leave blank to use latest item title" />
        </div>
        <button onClick={onDelete} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>
  );
}

function SectionRow({
  link,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}: {
  link: Link;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMove(-1)}
          disabled={isFirst}
          className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2L1 7h8L5 2z" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={isLast}
          className="flex h-5 w-5 items-center justify-center rounded text-black/20 hover:text-black/60 dark:text-white/20 dark:hover:text-white/60 disabled:opacity-20 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 8L1 3h8L5 8z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">§</span>
      <input
        value={link.title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder="Section label"
        className="flex-1 h-7 bg-transparent text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50 placeholder-black/20 dark:placeholder-white/20 outline-none"
      />
      <button
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function SocialRow({
  social,
  onChange,
  onDelete,
}: {
  social: SocialLink;
  onChange: (field: string, value: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/8 bg-white dark:bg-black p-3">
      <div className="flex-1 grid grid-cols-[1fr_auto] gap-2 items-center">
        <Input value={social.url} onChange={(v) => onChange("url", v)} placeholder="https://" />
        <IconSelect value={social.icon} onChange={(v) => onChange("icon", v)} />
      </div>
      <button
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function AvatarUpload({
  avatarUrl,
  initials,
  onUploaded,
}: {
  avatarUrl?: string;
  initials: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(avatarUrl);

  async function handleFile(file: File) {
    setUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const { url } = await res.json();
    onUploaded(url);
    setUploading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function removeImage() {
    setPreview(undefined);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="relative group cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="w-16 h-16 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-semibold text-xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden select-none relative">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            initials
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {preview && (
        <button
          onClick={removeImage}
          className="text-[10px] text-black/30 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      )}
      {!preview && (
        <span className="text-[10px] text-black/30 dark:text-white/30">Upload</span>
      )}
    </div>
  );
}

const FONTS = [
  { value: "mono",          label: "Geist Mono",    style: "var(--font-geist-mono), monospace" },
  { value: "sans",          label: "Geist Sans",    style: "var(--font-geist-sans), sans-serif" },
  { value: "inter",         label: "Inter",         style: "var(--font-inter), sans-serif" },
  { value: "dm-sans",       label: "DM Sans",       style: "var(--font-dm-sans), sans-serif" },
  { value: "outfit",        label: "Outfit",        style: "var(--font-outfit), sans-serif" },
  { value: "space-grotesk", label: "Space Grotesk", style: "var(--font-space-grotesk), sans-serif" },
  { value: "playfair",      label: "Playfair",      style: "var(--font-playfair), Georgia, serif" },
  { value: "lora",          label: "Lora",          style: "var(--font-lora), Georgia, serif" },
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FONTS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`h-10 rounded-md border text-xs transition-colors ${
            value === f.value
              ? "border-black dark:border-white text-black dark:text-white bg-black/5 dark:bg-white/5"
              : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:border-black/25 dark:hover:border-white/25 hover:text-black/70 dark:hover:text-white/70"
          }`}
          style={{ fontFamily: f.style }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ── Style Picker ─────────────────────────────────────────────────────────────

const CARD_STYLE_OPTIONS: Array<{
  value: string;
  label: string;
  preview: React.ReactNode;
}> = [
  {
    value: "minimal",
    label: "Minimal",
    preview: (
      <div className="w-full h-8 rounded-lg border border-black/15 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.04] flex items-center px-2 gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-black/10 dark:bg-white/10 shrink-0" />
        <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        <div className="w-1.5 h-1.5 rounded bg-black/10 dark:bg-white/10 shrink-0" />
      </div>
    ),
  },
  {
    value: "solid",
    label: "Solid",
    preview: (
      <div className="w-full h-8 rounded-lg bg-black dark:bg-white flex items-center px-2 gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-white/20 dark:bg-black/20 shrink-0" />
        <div className="flex-1 h-1.5 rounded bg-white/30 dark:bg-black/30" />
        <div className="w-1.5 h-1.5 rounded bg-white/20 dark:bg-black/20 shrink-0" />
      </div>
    ),
  },
  {
    value: "ghost",
    label: "Ghost",
    preview: (
      <div className="w-full h-8 rounded-lg flex items-center px-2 gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-black/8 dark:bg-white/8 shrink-0" />
        <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        <div className="w-1.5 h-1.5 rounded bg-black/8 dark:bg-white/8 shrink-0" />
      </div>
    ),
  },
  {
    value: "lift",
    label: "Lift",
    preview: (
      <div className="w-full h-8 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.06] shadow-lg flex items-center px-2 gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-black/8 dark:bg-white/8 shrink-0" />
        <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        <div className="w-1.5 h-1.5 rounded bg-black/8 dark:bg-white/8 shrink-0" />
      </div>
    ),
  },
  {
    value: "sharp",
    label: "Sharp",
    preview: (
      <div className="w-full h-8 border-l-2 border-black/40 dark:border-white/40 flex items-center px-2 gap-1.5">
        <div className="w-3.5 h-3.5 rounded-sm bg-black/8 dark:bg-white/8 shrink-0" />
        <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        <div className="w-2 h-1.5 rounded bg-black/8 dark:bg-white/8 shrink-0" />
      </div>
    ),
  },
];

function StylePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {CARD_STYLE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col gap-2 p-2 rounded-lg border transition-colors ${
              active
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5"
                : "border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20"
            }`}
          >
            {opt.preview}
            <span className={`text-[11px] text-center ${active ? "text-black dark:text-white font-medium" : "text-black/40 dark:text-white/40"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Size Picker ──────────────────────────────────────────────────────────────

const CARD_SIZE_OPTIONS = [
  {
    value: "sm",
    label: "Small",
    preview: (
      <div className="w-full flex items-center justify-center py-1">
        <div className="w-full h-6 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center px-1.5 gap-1">
          <div className="w-2.5 h-2.5 rounded bg-black/10 dark:bg-white/10 shrink-0" />
          <div className="flex-1 h-1 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    ),
  },
  {
    value: "md",
    label: "Regular",
    preview: (
      <div className="w-full flex items-center justify-center">
        <div className="w-full h-8 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center px-2 gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-black/10 dark:bg-white/10 shrink-0" />
          <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    ),
  },
  {
    value: "lg",
    label: "Large",
    preview: (
      <div className="w-full flex items-center justify-center">
        <div className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center px-2.5 gap-2">
          <div className="w-5 h-5 rounded bg-black/10 dark:bg-white/10 shrink-0" />
          <div className="flex-1 h-1.5 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    ),
  },
  {
    value: "xl",
    label: "XL",
    preview: (
      <div className="w-full flex items-center justify-center">
        <div className="w-full h-14 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center px-3 gap-2.5">
          <div className="w-6 h-6 rounded bg-black/10 dark:bg-white/10 shrink-0" />
          <div className="flex-1 h-2 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    ),
  },
];

function SizePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CARD_SIZE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col gap-2 p-2 rounded-lg border transition-colors ${
              active
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5"
                : "border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20"
            }`}
          >
            {opt.preview}
            <span className={`text-[11px] text-center ${active ? "text-black dark:text-white font-medium" : "text-black/40 dark:text-white/40"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Color Picker ─────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: "None",    value: "" },
  { label: "Gold",    value: "#C9A84C" },
  { label: "Silver",  value: "#A0A0A8" },
  { label: "Rose",    value: "#E11D48" },
  { label: "Orange",  value: "#F97316" },
  { label: "Amber",   value: "#D97706" },
  { label: "Emerald", value: "#10B981" },
  { label: "Blue",    value: "#3B82F6" },
  { label: "Violet",  value: "#8B5CF6" },
  { label: "Pink",    value: "#EC4899" },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = value !== "" && !COLOR_PRESETS.some((p) => p.value === value);

  return (
    <div className="grid grid-cols-5 gap-2">
      {COLOR_PRESETS.map((preset) => {
        const active = value === preset.value;
        return (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            title={preset.label}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors ${
              active
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5"
                : "border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20"
            }`}
          >
            <div
              className="w-full h-6 rounded-md"
              style={
                preset.value
                  ? { backgroundColor: preset.value }
                  : {
                      backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)",
                      backgroundSize: "10px 10px",
                    }
              }
            />
            <span className={`text-[10px] truncate w-full text-center ${active ? "text-black dark:text-white font-medium" : "text-black/40 dark:text-white/40"}`}>
              {preset.label}
            </span>
          </button>
        );
      })}

      <label
        title="Custom color"
        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors cursor-pointer ${
          isCustom
            ? "border-black dark:border-white bg-black/5 dark:bg-white/5"
            : "border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20"
        }`}
      >
        <div
          className="w-full h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: isCustom ? value : undefined }}
        >
          {!isCustom && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/30 dark:text-white/30">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          )}
        </div>
        <span className={`text-[10px] w-full text-center ${isCustom ? "text-black dark:text-white font-medium" : "text-black/40 dark:text-white/40"}`}>
          Custom
        </span>
        <input
          type="color"
          value={isCustom ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  );
}

// ── Background Picker ─────────────────────────────────────────────────────────

const GRADIENT_PRESETS = [
  { label: "Midnight", value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { label: "Ocean",    value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { label: "Dusk",     value: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)" },
  { label: "Violet",   value: "linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)" },
  { label: "Rose",     value: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)" },
  { label: "Sunset",   value: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
  { label: "Forest",   value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { label: "Mist",     value: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" },
  { label: "Steel",    value: "linear-gradient(135deg, #485563 0%, #29323c 100%)" },
  { label: "Aurora",   value: "linear-gradient(135deg, #00c3ff 0%, #74ee15 100%)" },
];

function BgPicker({
  bgType,
  bgValue,
  onTypeChange,
  onValueChange,
}: {
  bgType: string;
  bgValue: string;
  onTypeChange: (v: string) => void;
  onValueChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImageFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "background");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const { url } = await res.json();
    onTypeChange("image");
    onValueChange(url);
    setUploading(false);
  }

  const tabs = [
    { key: "none", label: "None" },
    { key: "solid", label: "Color" },
    { key: "gradient", label: "Gradient" },
    { key: "image", label: "Image" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Type tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { onTypeChange(t.key); if (t.key === "none") onValueChange(""); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              bgType === t.key
                ? "bg-black/8 dark:bg-white/8 text-black dark:text-white"
                : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {bgType === "solid" && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={bgValue || "#000000"}
            onChange={(e) => onValueChange(e.target.value)}
            className="h-8 w-12 rounded-md border border-black/10 dark:border-white/10 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={bgValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="#000000"
            className="h-8 w-32 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 text-xs text-black dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
          />
        </div>
      )}

      {bgType === "gradient" && (
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.label}
              onClick={() => onValueChange(g.value)}
              title={g.label}
              className={`flex flex-col gap-1.5 p-1.5 rounded-lg border transition-colors ${
                bgValue === g.value
                  ? "border-black dark:border-white"
                  : "border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20"
              }`}
            >
              <div className="w-full h-8 rounded-md" style={{ background: g.value }} />
              <span className={`text-[10px] text-center truncate w-full ${bgValue === g.value ? "text-black dark:text-white font-medium" : "text-black/40 dark:text-white/40"}`}>
                {g.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {bgType === "image" && (
        <div className="flex flex-col gap-2">
          <div
            className="relative group cursor-pointer h-24 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02]"
            onClick={() => inputRef.current?.click()}
          >
            {bgValue ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgValue} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-black/30 dark:text-white/30">Click to upload image</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <span className="text-xs text-white font-medium">Change image</span>
              )}
            </div>
          </div>
          {bgValue && (
            <button
              onClick={() => onValueChange("")}
              className="self-start text-[10px] text-black/25 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Remove image
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />
        </div>
      )}
    </div>
  );
}

// ── QR Modal ─────────────────────────────────────────────────────────────────

function QRModal({ username, onClose }: { username: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${username}`
    : `/${username}`;

  function download() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-qr.png`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <h2 className="text-sm font-medium text-black dark:text-white">QR Code</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div ref={canvasRef} className="p-4 bg-white rounded-xl">
          <QRCodeCanvas
            value={profileUrl}
            size={200}
            marginSize={0}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <p className="text-xs text-black/30 dark:text-white/30 font-mono">{profileUrl}</p>

        <button
          onClick={download}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-4 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PNG
        </button>
      </div>
    </div>
  );
}
