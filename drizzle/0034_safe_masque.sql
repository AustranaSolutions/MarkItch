CREATE TABLE "creator_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"period" text NOT NULL,
	"prompt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD COLUMN "solo_pitch_id" uuid;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD COLUMN "creator_challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "creator_challenges" ADD CONSTRAINT "creator_challenges_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_challenges_brand_period_unique_idx" ON "creator_challenges" USING btree ("brand_id","period");--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD CONSTRAINT "casting_submissions_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD CONSTRAINT "solo_pitches_creator_challenge_id_creator_challenges_id_fk" FOREIGN KEY ("creator_challenge_id") REFERENCES "public"."creator_challenges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "solo_pitches_challenge_brand_unique_idx" ON "solo_pitches" USING btree ("creator_challenge_id","brand_id");