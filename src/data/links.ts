export type Link = {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  type?: "link" | "header" | "embed";
  startsAt?: string | null;
  endsAt?: string | null;
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
  bgType?: string;
  bgValue?: string;
  bookingEnabled?: boolean;
  bookingTitle?: string;
  bookingDuration?: number;
  bookingBuffer?: number;
  bookingAdvanceDays?: number;
  bookingEmail?: string;
  bookingTimezone?: string;
};

export type LinksData = {
  profile: Profile;
  links: Link[];
  socialLinks: SocialLink[];
};
