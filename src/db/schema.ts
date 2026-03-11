import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  name: text("name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarInitials: text("avatar_initials").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
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
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  platform: text("platform").notNull().default(""),
  url: text("url").notNull().default("#"),
  icon: text("icon").notNull().default("globe"),
  position: integer("position").notNull().default(0),
});
