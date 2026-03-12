"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useClerk } from "@clerk/nextjs";
import { QRCodeCanvas } from "qrcode.react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { LinksData, Link, SocialLink } from "@/data/links";

const ICONS = ["globe", "zap", "pen", "mail", "calendar", "github", "twitter", "linkedin", "youtube"];

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
};

export function AdminClient() {
  const [data, setData] = useState<LinksData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"content" | "analytics">("content");
  const [showQR, setShowQR] = useState(false);
  const { signOut } = useClerk();

  useEffect(() => {
    Promise.all([
      fetch("/api/data").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([d, s]) => {
      setData(d);
      if (d.profile?.username) setUsername(d.profile.username);
      setStats(s);
    });
  }, []);

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
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <span className="text-xs text-black/30 dark:text-white/30">Loading…</span>
      </div>
    );
  }

  function updateProfile(field: string, value: string) {
    const next = { ...data!, profile: { ...data!.profile, [field]: value } };
    setData(next);
  }

  function updateLink(id: string, field: string, value: string) {
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
        { id: genId(), title: "New Link", description: "", url: "#", icon: "globe", type: "link" as const },
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
        { platform: "New Platform", url: "#", icon: "globe" },
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
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 h-12">
          <div className="flex items-center gap-4">
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
            <nav className="flex gap-1">
              {(["content", "analytics"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
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
          <div className="flex items-center gap-2">
            {tab === "content" && (
              <>
                <span className={`text-xs transition-all duration-300 ${saved ? "text-emerald-500" : "text-black/0 dark:text-white/0"}`}>
                  Saved
                </span>
                <button
                  onClick={() => save(data!)}
                  disabled={saving}
                  className="flex h-7 items-center gap-1.5 rounded-md bg-black px-3 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-black"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex h-7 items-center rounded-md border border-black/10 dark:border-white/10 px-3 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-4 py-10 flex flex-col gap-8">

        {tab === "content" && (
          <>
            {/* Profile section */}
            <Section title="Profile">
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

            {/* Links section */}
            <Section
              title="Links"
              action={
                <div className="flex items-center gap-3">
                  <button
                    onClick={addSection}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Add section
                  </button>
                  <button
                    onClick={addLink}
                    className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Add link
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
                <button
                  onClick={addSocial}
                  className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                >
                  <span className="text-base leading-none">+</span> Add
                </button>
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
          </>
        )}

        {tab === "analytics" && (
          <AnalyticsTab links={data.links} />
        )}

      </main>

      {showQR && username && (
        <QRModal username={username} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ links }: { links: Link[] }) {
  const [days, setDays] = useState<7 | 14 | 30>(14);
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
        <span className="text-xs text-black/30 dark:text-white/30">Loading analytics…</span>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayClicks = localStats.clicksByDay.find((d) => d.date === today)?.count ?? 0;
  const totalClicks = localStats.clicksByDay.reduce((a, b) => a + b.count, 0);
  const rangeLabel = `Last ${days} Days`;

  const bestDayLabel = localStats.bestDay
    ? new Date(localStats.bestDay.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  const rankedLinks = links
    .filter((l) => l.type !== "header")
    .map((l) => ({ id: l.id, title: l.title, count: localStats.byLink[l.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const maxLinkClicks = Math.max(...rankedLinks.map((l) => l.count), 1);

  return (
    <div className="flex flex-col gap-8">
      {/* Range toggle */}
      <div className="flex items-center justify-end gap-1">
        {([7, 14, 30] as const).map((d) => (
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
        <StatCard label="Clicks" value={totalClicks.toLocaleString()} sub={rangeLabel} />
        <StatCard label="Profile views" value={localStats.totalViews.toLocaleString()} sub="All time" />
        <StatCard label="Today" value={todayClicks.toLocaleString()} sub="Clicks" />
        <StatCard
          label="Best day"
          value={localStats.bestDay ? localStats.bestDay.count.toLocaleString() : "—"}
          sub={bestDayLabel}
        />
      </div>

      {/* Clicks chart */}
      <Section title={`Clicks — ${rangeLabel}`}>
        <BarChart data={localStats.clicksByDay} today={today} />
      </Section>

      {/* Views chart */}
      <Section title={`Profile Views — ${rangeLabel}`}>
        <BarChart data={localStats.viewsByDay} today={today} dim />
      </Section>

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
                      <div
                        className="h-full rounded-full bg-black/25 dark:bg-white/25 transition-all"
                        style={{ width: `${(link.count / maxLinkClicks) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <p className="text-center text-[11px] text-black/20 dark:text-white/20">
        CTR = link clicks ÷ total profile views. Charts update in real time.
      </p>
    </div>
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
      rows={2}
      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-black/20 dark:placeholder-white/20 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none"
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
  onChange: (field: string, value: string) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
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
  onChange: (field: string, value: string) => void;
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
      <div className="flex-1 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <Input value={social.platform} onChange={(v) => onChange("platform", v)} placeholder="Platform" />
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
  { value: "mono", label: "Geist Mono", style: "var(--font-geist-mono), monospace" },
  { value: "sans", label: "Geist Sans", style: "var(--font-geist-sans), sans-serif" },
  { value: "inter", label: "Inter", style: "var(--font-inter), sans-serif" },
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {FONTS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`flex-1 h-9 rounded-md border text-xs transition-colors ${
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
