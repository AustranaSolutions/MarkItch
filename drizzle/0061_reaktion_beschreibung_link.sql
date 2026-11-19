ALTER TABLE "reactions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "cta_label" text;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "cta_url" text;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "cta_code" text;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "paid_partnership" boolean DEFAULT false NOT NULL;