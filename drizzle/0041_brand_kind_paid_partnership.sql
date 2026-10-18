ALTER TABLE "battles" ADD COLUMN "brand_a_paid_partnership" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "brand_b_paid_partnership" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "kind" text DEFAULT 'brand' NOT NULL;--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD COLUMN "paid_partnership" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_paid_partnership" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_submissions" ADD COLUMN "paid_partnership" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD COLUMN "paid_partnership" boolean DEFAULT false NOT NULL;