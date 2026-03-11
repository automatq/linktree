import { Icon } from "./Icons";
import type { SocialLink } from "@/data/links";

type SocialLinksProps = {
  links: SocialLink[];
};

export function SocialLinks({ links }: SocialLinksProps) {
  return (
    <div className="flex items-center gap-1">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.platform}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-black/30 transition-colors duration-150 hover:bg-black/5 hover:text-black/70 dark:text-white/30 dark:hover:bg-white/5 dark:hover:text-white/80"
        >
          <Icon name={link.icon} size={18} />
        </a>
      ))}
    </div>
  );
}
