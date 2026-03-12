export type Link = {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  type?: "link" | "header" | "embed" | "booking";
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
  stripeAccountId?: string;
  stripePublishableKey?: string;
  emailCaptureEnabled?: boolean;
  emailCaptureTitle?: string;
  emailCaptureButtonText?: string;
  bookingEnabled?: boolean;
  bookingTitle?: string;
  bookingDuration?: number;
  bookingBuffer?: number;
  bookingAdvanceDays?: number;
  bookingEmail?: string;
  bookingTimezone?: string;
  bookingSmsNumber?: string;
  socialLinksPosition?: "footer" | "bio";
  customDomain?: string;
  tipJarEnabled?: boolean;
  tipJarTitle?: string;
  tipJarAmounts?: string;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number; // cents
  currency: string;
  fileUrl: string;
  coverUrl: string;
  active: boolean;
  position: number;
};

export type LinksData = {
  profile: Profile;
  links: Link[];
  socialLinks: SocialLink[];
};
