import { Icon } from "./Icons";
import type { SocialLink } from "@/data/links";
import type { CardSize } from "./LinkCard";

type SocialLinksProps = {
  links: SocialLink[];
  size?: CardSize;
};

const SIZE: Record<CardSize, { wrap: string; icon: number }> = {
  sm: { wrap: "h-7 w-7",   icon: 14 },
  md: { wrap: "h-9 w-9",   icon: 18 },
  lg: { wrap: "h-10 w-10", icon: 20 },
  xl: { wrap: "h-12 w-12", icon: 24 },
};

export function SocialLinks({ links, size = "md" }: SocialLinksProps) {
  const s = SIZE[size];
  return (
    <div className="flex items-center gap-1">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.platform}
          className={`flex ${s.wrap} items-center justify-center rounded-lg text-black/30 transition-colors duration-150 hover:bg-black/5 hover:text-black/70 dark:text-white/30 dark:hover:bg-white/5 dark:hover:text-white/80`}
        >
          <Icon name={link.icon} size={s.icon} />
        </a>
      ))}
    </div>
  );
}
