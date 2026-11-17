CREATE TABLE "duel_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"brand_a_id" uuid NOT NULL,
	"brand_b_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"saved_for_later" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid,
	"device_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "duel_poll_options" ADD CONSTRAINT "duel_poll_options_poll_id_duel_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."duel_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_poll_options" ADD CONSTRAINT "duel_poll_options_brand_a_id_brands_id_fk" FOREIGN KEY ("brand_a_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_poll_options" ADD CONSTRAINT "duel_poll_options_brand_b_id_brands_id_fk" FOREIGN KEY ("brand_b_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_poll_votes" ADD CONSTRAINT "duel_poll_votes_poll_id_duel_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."duel_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_poll_votes" ADD CONSTRAINT "duel_poll_votes_option_id_duel_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."duel_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_poll_votes" ADD CONSTRAINT "duel_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duel_poll_options_poll_idx" ON "duel_poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duel_poll_votes_poll_user_idx" ON "duel_poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duel_poll_votes_poll_device_idx" ON "duel_poll_votes" USING btree ("poll_id","device_hash");--> statement-breakpoint
CREATE INDEX "duel_poll_votes_option_idx" ON "duel_poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "duel_polls_status_created_idx" ON "duel_polls" USING btree ("status","created_at");--> statement-breakpoint
-- Wie 0036/0051: RLS an, keine Policies.
ALTER TABLE "duel_polls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "duel_poll_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "duel_poll_votes" ENABLE ROW LEVEL SECURITY;
