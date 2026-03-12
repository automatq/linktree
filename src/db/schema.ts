import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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
  // Booking config
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  bookingTitle: text("booking_title").notNull().default("Book a call"),
  bookingDuration: integer("booking_duration").notNull().default(30),
  bookingBuffer: integer("booking_buffer").notNull().default(0),
  bookingAdvanceDays: integer("booking_advance_days").notNull().default(30),
  bookingEmail: text("booking_email").notNull().default(""),
  bookingTimezone: text("booking_timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Weekly recurring availability windows
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 1=Mon, …, 6=Sat
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(),     // "17:00"
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
  createdAt: timestamp("created_at").defaultNow(),
});
