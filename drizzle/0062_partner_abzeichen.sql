ALTER TABLE "partner_castings" ADD COLUMN "partner_submission_id" uuid;--> statement-breakpoint
ALTER TABLE "partner_castings" ADD COLUMN "partner_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "partner_castings" ADD COLUMN "partner_removal_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "partner_castings" ADD COLUMN "partner_removal_note" text;