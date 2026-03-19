-- Replace team_booking columns with group-based booking columns on profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "booking_group_id" text DEFAULT '' NOT NULL;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "booking_strategy" text DEFAULT 'least-busy' NOT NULL;

-- Replace team_member_id with assigned_member_profile_id on bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "assigned_member_profile_id" integer;

-- Drop old team columns (safe — they were just added and have no data)
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "team_booking_enabled";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "team_booking_strategy";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "team_member_id";

-- Drop team tables (safe — just created, no data)
DROP TABLE IF EXISTS "team_availability";
DROP TABLE IF EXISTS "team_members";
