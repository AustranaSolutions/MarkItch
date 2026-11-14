CREATE TABLE "seen_content" (
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seen_content" ADD CONSTRAINT "seen_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seen_content_user_target_idx" ON "seen_content" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "seen_content_seen_at_idx" ON "seen_content" USING btree ("seen_at");--> statement-breakpoint
-- Wie 0036/0051: RLS an, keine Policies.
ALTER TABLE "seen_content" ENABLE ROW LEVEL SECURITY;