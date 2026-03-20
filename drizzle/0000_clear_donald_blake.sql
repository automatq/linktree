CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"guest_timezone" text DEFAULT 'UTC' NOT NULL,
	"guest_phone" text DEFAULT '' NOT NULL,
	"sms_reminder_24h_sent" boolean DEFAULT false NOT NULL,
	"sms_reminder_1h_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"link_url" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"member_profile_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"name" text DEFAULT 'My Crew' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"profile_id" integer NOT NULL,
	"clicked_at" timestamp DEFAULT now(),
	"referrer" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '#' NOT NULL,
	"icon" text DEFAULT 'globe' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'link' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"profile_id" integer NOT NULL,
	"guest_email" text NOT NULL,
	"guest_name" text DEFAULT '' NOT NULL,
	"stripe_session_id" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"option_id" text NOT NULL,
	"voter_profile_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"question" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"multiple_choice" boolean DEFAULT false NOT NULL,
	"ends_at" timestamp,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "previous_usernames" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"username" text NOT NULL,
	"changed_at" timestamp DEFAULT now(),
	CONSTRAINT "previous_usernames_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT now(),
	"referrer" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_initials" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"font" text DEFAULT 'mono' NOT NULL,
	"card_style" text DEFAULT 'minimal' NOT NULL,
	"card_size" text DEFAULT 'md' NOT NULL,
	"accent_color" text DEFAULT '' NOT NULL,
	"bg_type" text DEFAULT 'none' NOT NULL,
	"bg_value" text DEFAULT '' NOT NULL,
	"stripe_account_id" text DEFAULT '' NOT NULL,
	"stripe_publishable_key" text DEFAULT '' NOT NULL,
	"stripe_secret_key" text DEFAULT '' NOT NULL,
	"email_capture_enabled" boolean DEFAULT false NOT NULL,
	"email_capture_title" text DEFAULT 'Stay in the loop' NOT NULL,
	"email_capture_button_text" text DEFAULT 'Subscribe' NOT NULL,
	"booking_enabled" boolean DEFAULT false NOT NULL,
	"booking_title" text DEFAULT 'Book a call' NOT NULL,
	"booking_duration" integer DEFAULT 30 NOT NULL,
	"booking_buffer" integer DEFAULT 0 NOT NULL,
	"booking_advance_days" integer DEFAULT 30 NOT NULL,
	"booking_email" text DEFAULT '' NOT NULL,
	"booking_timezone" text DEFAULT 'UTC' NOT NULL,
	"booking_sms_number" text DEFAULT '' NOT NULL,
	"social_links_position" text DEFAULT 'footer' NOT NULL,
	"custom_domain" text DEFAULT '' NOT NULL,
	"tip_jar_enabled" boolean DEFAULT false NOT NULL,
	"tip_jar_title" text DEFAULT 'Support my work' NOT NULL,
	"tip_jar_amounts" text DEFAULT '3,5,10,25' NOT NULL,
	"meta_pixel_id" text DEFAULT '' NOT NULL,
	"tiktok_pixel_id" text DEFAULT '' NOT NULL,
	"google_tag_id" text DEFAULT '' NOT NULL,
	"webhook_url" text DEFAULT '' NOT NULL,
	"hero_enabled" boolean DEFAULT false NOT NULL,
	"hero_image_url" text DEFAULT '' NOT NULL,
	"hero_headline" text DEFAULT '' NOT NULL,
	"hero_subtitle" text DEFAULT '' NOT NULL,
	"hero_cta_text" text DEFAULT '' NOT NULL,
	"hero_cta_url" text DEFAULT '' NOT NULL,
	"contact_form_enabled" boolean DEFAULT false NOT NULL,
	"contact_form_title" text DEFAULT 'Get in touch' NOT NULL,
	"contact_form_email" text DEFAULT '' NOT NULL,
	"contact_form_sms_number" text DEFAULT '' NOT NULL,
	"gallery_enabled" boolean DEFAULT false NOT NULL,
	"gallery_title" text DEFAULT 'Gallery' NOT NULL,
	"gallery_columns" integer DEFAULT 3 NOT NULL,
	"groups_enabled" boolean DEFAULT false NOT NULL,
	"wall_enabled" boolean DEFAULT false NOT NULL,
	"wall_title" text DEFAULT 'The Wall' NOT NULL,
	"wall_max_notes" integer DEFAULT 50 NOT NULL,
	"voice_rooms_enabled" boolean DEFAULT false NOT NULL,
	"reviews_enabled" boolean DEFAULT false NOT NULL,
	"polls_enabled" boolean DEFAULT false NOT NULL,
	"username_changed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"author_profile_id" integer NOT NULL,
	"recommend" boolean NOT NULL,
	"audio_url" text NOT NULL,
	"audio_duration" integer DEFAULT 0 NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"photos" text DEFAULT '[]' NOT NULL,
	"verified_client" boolean DEFAULT false NOT NULL,
	"response" text DEFAULT '' NOT NULL,
	"responded_at" timestamp,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '#' NOT NULL,
	"icon" text DEFAULT 'globe' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"subscribed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracked_link_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracked_link_id" text NOT NULL,
	"profile_id" integer NOT NULL,
	"clicked_at" timestamp DEFAULT now(),
	"referrer" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_links" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"destination_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"profile_id" integer NOT NULL,
	"author_profile_id" integer NOT NULL,
	"audio_url" text NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wall_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"author_profile_id" integer NOT NULL,
	"message" text NOT NULL,
	"color" text DEFAULT 'yellow' NOT NULL,
	"rotation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_member_profile_id_profiles_id_fk" FOREIGN KEY ("member_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_voter_profile_id_profiles_id_fk" FOREIGN KEY ("voter_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_usernames" ADD CONSTRAINT "previous_usernames_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_link_clicks" ADD CONSTRAINT "tracked_link_clicks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_room_id_voice_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."voice_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_rooms" ADD CONSTRAINT "voice_rooms_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_notes" ADD CONSTRAINT "wall_notes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_notes" ADD CONSTRAINT "wall_notes_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_profile_id_idx" ON "bookings" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "bookings_profile_status_idx" ON "bookings" USING btree ("profile_id","status");--> statement-breakpoint
CREATE INDEX "group_members_group_id_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "groups_profile_id_idx" ON "groups" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "link_clicks_profile_id_clicked_at_idx" ON "link_clicks" USING btree ("profile_id","clicked_at");--> statement-breakpoint
CREATE INDEX "link_clicks_link_id_idx" ON "link_clicks" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "links_profile_id_idx" ON "links" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "orders_profile_id_created_at_idx" ON "orders" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_id_idx" ON "poll_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "poll_votes_voter_profile_idx" ON "poll_votes" USING btree ("poll_id","voter_profile_id");--> statement-breakpoint
CREATE INDEX "polls_profile_id_idx" ON "polls" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "products_profile_id_idx" ON "products" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_views_profile_id_idx" ON "profile_views" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_views_profile_id_viewed_at_idx" ON "profile_views" USING btree ("profile_id","viewed_at");--> statement-breakpoint
CREATE INDEX "profiles_custom_domain_idx" ON "profiles" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "reviews_profile_id_idx" ON "reviews" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "reviews_author_profile_id_idx" ON "reviews" USING btree ("author_profile_id");--> statement-breakpoint
CREATE INDEX "subscribers_profile_id_idx" ON "subscribers" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "subscribers_profile_email_idx" ON "subscribers" USING btree ("profile_id","email");--> statement-breakpoint
CREATE INDEX "tracked_link_clicks_tracked_link_id_idx" ON "tracked_link_clicks" USING btree ("tracked_link_id","clicked_at");--> statement-breakpoint
CREATE INDEX "tracked_link_clicks_profile_id_idx" ON "tracked_link_clicks" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "voice_notes_room_id_idx" ON "voice_notes" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "voice_rooms_profile_id_idx" ON "voice_rooms" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "wall_notes_profile_id_idx" ON "wall_notes" USING btree ("profile_id");