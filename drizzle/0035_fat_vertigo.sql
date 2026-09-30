ALTER TABLE "challenges" ADD COLUMN "challenger_video_url" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_cta_label" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_cta_url" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_contains_ai_content" boolean DEFAULT false NOT NULL;