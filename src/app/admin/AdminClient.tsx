"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useClerk } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { LinksData, Link, SocialLink } from "@/data/links";

const ICONS = ["globe", "zap", "pen", "mail", "calendar", "github", "twitter", "linkedin", "youtube"];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export function AdminClient() {
  const [data, setData] = useState<LinksData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const { signOut } = useClerk();

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then((d) => {
      setData(d);
      if (d.profile?.username) setUsername(d.profile.username);
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
        { id: genId(), title: "New Link", description: "", url: "#", icon: "globe" },
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
          <div className="flex items-center gap-3">
            {username && (
              <a href={`/${username}`} target="_blank" className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                ← Live page
              </a>
            )}
            <span className="text-xs font-medium text-black/70 dark:text-white/70">CMS</span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Links section */}
        <Section
          title="Links"
          action={
            <button
              onClick={addLink}
              className="flex items-center gap-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              <span className="text-base leading-none">+</span> Add link
            </button>
          }
        >
          <div className="flex flex-col gap-2">
            {data.links.map((link, i) => (
              <LinkRow
                key={link.id}
                link={link}
                isFirst={i === 0}
                isLast={i === data.links.length - 1}
                onChange={(f, v) => updateLink(link.id, f, v)}
                onDelete={() => deleteLink(link.id)}
                onMove={(dir) => moveLink(link.id, dir)}
              />
            ))}
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

      </main>
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

      <div className="pl-7">
        <Input value={link.description ?? ""} onChange={(v) => onChange("description", v)} placeholder="Description (optional)" />
      </div>
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
        {/* Avatar circle */}
        <div className="w-16 h-16 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-semibold text-xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden select-none relative">
          {preview ? (
            <Image src={preview} alt="Avatar" fill className="object-cover" sizes="64px" />
          ) : (
            initials
          )}
          {/* Overlay on hover */}
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
