ALTER TABLE "brands" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "verification_url" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "verification_requested_at" timestamp with time zone;