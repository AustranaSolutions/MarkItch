CREATE TABLE "saved_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"cta_url" text NOT NULL,
	"cta_label" text,
	"video_url" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "brand_a_cta_code" text;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "brand_b_cta_code" text;--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD COLUMN "cta_code" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_cta_code" text;--> statement-breakpoint
ALTER TABLE "creator_submissions" ADD COLUMN "cta_code" text;--> statement-breakpoint
ALTER TABLE "post_drafts" ADD COLUMN "cta_code" text;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD COLUMN "cta_code" text;--> statement-breakpoint
ALTER TABLE "saved_codes" ADD CONSTRAINT "saved_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_codes" ADD CONSTRAINT "saved_codes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_codes_user_target_idx" ON "saved_codes" USING btree ("user_id","target_type","target_id","brand_id");--> statement-breakpoint
CREATE INDEX "saved_codes_user_created_idx" ON "saved_codes" USING btree ("user_id","created_at");--> statement-breakpoint
-- Wie 0036/0051: RLS an, keine Policies (App greift als Besitzer zu).
ALTER TABLE "saved_codes" ENABLE ROW LEVEL SECURITY;