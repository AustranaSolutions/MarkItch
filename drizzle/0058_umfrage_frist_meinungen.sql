ALTER TABLE "comments" ADD COLUMN "poll_id" uuid;--> statement-breakpoint
ALTER TABLE "duel_poll_options" ADD COLUMN "sent_to_brands_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "duel_polls" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_poll_id_duel_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."duel_polls"("id") ON DELETE cascade ON UPDATE no action;