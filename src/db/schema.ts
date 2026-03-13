import { pgTable, serial, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";


export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  name: text("name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarInitials: text("avatar_initials").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  font: text("font").notNull().default("mono"),
  cardStyle: text("card_style").notNull().default("minimal"),
  cardSize: text("card_size").notNull().default("md"),
  accentColor: text("accent_color").notNull().default(""),
  bgType: text("bg_type").notNull().default("none"),
  bgValue: text("bg_value").notNull().default(""),
  // Stripe keys (user's own account)
  stripeAccountId: text("stripe_account_id").notNull().default(""),
  stripePublishableKey: text("stripe_publishable_key").notNull().default(""),
  stripeSecretKey: text("stripe_secret_key").notNull().default(""),
  // Email capture
  emailCaptureEnabled: boolean("email_capture_enabled").notNull().default(false),
  emailCaptureTitle: text("email_capture_title").notNull().default("Stay in the loop"),
  emailCaptureButtonText: text("email_capture_button_text").notNull().default("Subscribe"),
  // Booking config
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  bookingTitle: text("booking_title").notNull().default("Book a call"),
  bookingDuration: integer("booking_duration").notNull().default(30),
  bookingBuffer: integer("booking_buffer").notNull().default(0),
  bookingAdvanceDays: integer("booking_advance_days").notNull().default(30),
  bookingEmail: text("booking_email").notNull().default(""),
  bookingTimezone: text("booking_timezone").notNull().default("UTC"),
  bookingSmsNumber: text("booking_sms_number").notNull().default(""),
  socialLinksPosition: text("social_links_position").notNull().default("footer"), // "footer" | "bio"
  customDomain: text("custom_domain").notNull().default(""),
  tipJarEnabled: boolean("tip_jar_enabled").notNull().default(false),
  tipJarTitle: text("tip_jar_title").notNull().default("Support my work"),
  tipJarAmounts: text("tip_jar_amounts").notNull().default("3,5,10,25"),
  // Retargeting pixels
  metaPixelId: text("meta_pixel_id").notNull().default(""),
  tiktokPixelId: text("tiktok_pixel_id").notNull().default(""),
  googleTagId: text("google_tag_id").notNull().default(""),
  // Webhook / Zapier
  webhookUrl: text("webhook_url").notNull().default(""),
  // Featured / hero card
  heroEnabled: boolean("hero_enabled").notNull().default(false),
  heroImageUrl: text("hero_image_url").notNull().default(""),
  heroHeadline: text("hero_headline").notNull().default(""),
  heroSubtitle: text("hero_subtitle").notNull().default(""),
  heroCtaText: text("hero_cta_text").notNull().default(""),
  heroCtaUrl: text("hero_cta_url").notNull().default(""),
  // Media gallery
  galleryEnabled: boolean("gallery_enabled").notNull().default(false),
  galleryTitle: text("gallery_title").notNull().default("Gallery"),
  galleryColumns: integer("gallery_columns").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("profiles_custom_domain_idx").on(t.customDomain),
]);

export const links = pgTable("links", {
  id: text("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  url: text("url").notNull().default("#"),
  icon: text("icon").notNull().default("globe"),
  position: integer("position").notNull().default(0),
  type: text("type").notNull().default("link"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  platform: text("platform").notNull().default(""),
  url: text("url").notNull().default("#"),
  icon: text("icon").notNull().default("globe"),
  position: integer("position").notNull().default(0),
});

export const linkClicks = pgTable("link_clicks", {
  id: serial("id").primaryKey(),
  linkId: text("link_id").notNull(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  referrer: text("referrer").notNull().default(""),
  device: text("device").notNull().default(""),
  country: text("country").notNull().default(""),
});

export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
  referrer: text("referrer").notNull().default(""),
  device: text("device").notNull().default(""),
  country: text("country").notNull().default(""),
});

// Trackable links (named short links for external use)
export const trackedLinks = pgTable("tracked_links", {
  id: text("id").primaryKey(), // short random code e.g. "abc1234"
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  destinationUrl: text("destination_url").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackedLinkClicks = pgTable("tracked_link_clicks", {
  id: serial("id").primaryKey(),
  trackedLinkId: text("tracked_link_id").notNull(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  referrer: text("referrer").notNull().default(""),
  device: text("device").notNull().default(""),
  country: text("country").notNull().default(""),
});

// Media gallery images
export const galleryImages = pgTable("gallery_images", {
  id: text("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  linkUrl: text("link_url").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weekly recurring availability windows
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 1=Mon, …, 6=Sat
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(),     // "17:00"
});

// Digital products for the store
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0), // in cents
  currency: text("currency").notNull().default("usd"),
  fileUrl: text("file_url").notNull().default(""),
  coverUrl: text("cover_url").notNull().default(""),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders (digital product purchases via Stripe)
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  guestEmail: text("guest_email").notNull(),
  guestName: text("guest_name").notNull().default(""),
  stripeSessionId: text("stripe_session_id").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | paid
  createdAt: timestamp("created_at").defaultNow(),
});

// Email subscribers
export const subscribers = pgTable("subscribers", {
  id: text("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

// Individual bookings
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("confirmed"), // "confirmed" | "cancelled"
  guestTimezone: text("guest_timezone").notNull().default("UTC"),
  guestPhone: text("guest_phone").notNull().default(""),
  smsReminder24hSent: boolean("sms_reminder_24h_sent").notNull().default(false),
  smsReminder1hSent: boolean("sms_reminder_1h_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
