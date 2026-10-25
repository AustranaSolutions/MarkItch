CREATE TABLE "post_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_url" text,
	"description" text,
	"cta_label" text,
	"cta_url" text,
	"contains_ai_content" boolean DEFAULT false NOT NULL,
	"paid_partnership" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_trims" (
	"video_url" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"start_ms" integer DEFAULT 0 NOT NULL,
	"end_ms" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_drafts" ADD CONSTRAINT "post_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_trims" ADD CONSTRAINT "video_trims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_drafts_user_idx" ON "post_drafts" USING btree ("user_id","updated_at");--> statement-breakpoint
-- Konvention seit 0036: jede neue Tabelle sofort mit RLS (ohne Policies; die App ist Besitzer).
ALTER TABLE "post_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_trims" ENABLE ROW LEVEL SECURITY;
