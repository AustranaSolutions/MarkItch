CREATE TABLE "hidden_content" (
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"brand_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_videos" (
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "muted_notification_kinds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hidden_content" ADD CONSTRAINT "hidden_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_content" ADD CONSTRAINT "hidden_content_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_videos" ADD CONSTRAINT "saved_videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hidden_content_user_target_idx" ON "hidden_content" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "hidden_content_user_brand_idx" ON "hidden_content" USING btree ("user_id","brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_videos_user_target_idx" ON "saved_videos" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "saved_videos_user_created_idx" ON "saved_videos" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Wie 0036/0051: RLS an, keine Policies.
ALTER TABLE "saved_videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hidden_content" ENABLE ROW LEVEL SECURITY;
