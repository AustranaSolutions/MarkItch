ALTER TABLE "reactions" ALTER COLUMN "solo_pitch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "creator_challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_creator_challenge_id_creator_challenges_id_fk" FOREIGN KEY ("creator_challenge_id") REFERENCES "public"."creator_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_challenge_user_idx" ON "reactions" USING btree ("creator_challenge_id","user_id") WHERE "reactions"."creator_challenge_id" is not null;--> statement-breakpoint
-- Luca 05.11.: genau ein Ziel — Pitch (Reaktion) oder Creator-Challenge (Zuschauer-Beitrag).
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_target_check" CHECK (("solo_pitch_id" IS NOT NULL) <> ("creator_challenge_id" IS NOT NULL));
