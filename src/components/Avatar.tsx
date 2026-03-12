import Image from "next/image";

type AvatarProps = {
  initials: string;
  avatarUrl?: string;
  size?: number;
  accentColor?: string;
};

export function Avatar({ initials, avatarUrl, size = 80, accentColor }: AvatarProps) {
  const isGif = avatarUrl?.toLowerCase().includes(".gif");

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        ...(accentColor ? { backgroundColor: accentColor } : {}),
      }}
      className="relative flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold select-none shrink-0 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized={isGif}
        />
      ) : (
        initials
      )}
    </div>
  );
}
