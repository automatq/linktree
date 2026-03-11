import Image from "next/image";

type AvatarProps = {
  initials: string;
  avatarUrl?: string;
  size?: number;
};

export function Avatar({ initials, avatarUrl, size = 80 }: AvatarProps) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="relative flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold select-none shrink-0 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      ) : (
        initials
      )}
    </div>
  );
}
