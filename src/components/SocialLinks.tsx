import { Icon } from "./Icons";
import type { SocialLink } from "@/data/links";
import type { CardSize } from "./LinkCard";

type SocialLinksProps = {
  links: SocialLink[];
  size?: CardSize;
  accentColor?: string;
};

const SIZE: Record<CardSize, { wrap: string; icon: number }> = {
  sm: { wrap: "h-7 w-7",   icon: 14 },
  md: { wrap: "h-9 w-9",   icon: 18 },
  lg: { wrap: "h-10 w-10", icon: 20 },
  xl: { wrap: "h-12 w-12", icon: 24 },
};

export function SocialLinks({ links, size = "md", accentColor }: SocialLinksProps) {
  const s = SIZE[size];
  return (
    <div className="flex items-center gap-1">
      {links.map((link) => (
        <a
          key={link.platform}
          href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.platform}
          className={`flex ${s.wrap} items-center justify-center rounded-lg transition-all duration-150 ${
            accentColor
              ? "opacity-40 hover:opacity-100"
              : "text-black/30 hover:text-black/70 hover:bg-black/5 dark:text-white/30 dark:hover:text-white/80 dark:hover:bg-white/5"
          }`}
          style={accentColor ? { color: accentColor } : undefined}
        >
          <Icon name={link.icon} size={s.icon} />
        </a>
      ))}
    </div>
  );
}
