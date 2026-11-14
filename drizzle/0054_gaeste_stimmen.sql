CREATE TABLE "guest_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"device_hash" text NOT NULL,
	"voted_for_brand_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_votes" ADD CONSTRAINT "guest_votes_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_votes" ADD CONSTRAINT "guest_votes_voted_for_brand_id_brands_id_fk" FOREIGN KEY ("voted_for_brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_votes_battle_device_idx" ON "guest_votes" USING btree ("battle_id","device_hash");--> statement-breakpoint
CREATE INDEX "guest_votes_battle_idx" ON "guest_votes" USING btree ("battle_id","voted_for_brand_id");--> statement-breakpoint
-- Wie 0036/0051: RLS an, keine Policies.
ALTER TABLE "guest_votes" ENABLE ROW LEVEL SECURITY;