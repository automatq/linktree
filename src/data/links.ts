export type Link = {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  type?: "link" | "header";
};

export type SocialLink = {
  platform: string;
  url: string;
  icon: string;
};

export type Profile = {
  name: string;
  username: string;
  bio: string;
  avatarInitials: string;
  avatarUrl?: string;
  font?: string;
  cardStyle?: string;
  cardSize?: string;
  accentColor?: string;
};

export type LinksData = {
  profile: Profile;
  links: Link[];
  socialLinks: SocialLink[];
};
