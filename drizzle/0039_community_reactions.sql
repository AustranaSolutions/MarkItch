ALTER TABLE "reactions" ALTER COLUMN "brand_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_solo_pitch_user_top_level_unique_idx" ON "reactions" USING btree ("solo_pitch_id","user_id") WHERE "reactions"."parent_reaction_id" is null and "reactions"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_parent_reaction_user_unique_idx" ON "reactions" USING btree ("parent_reaction_id","user_id") WHERE "reactions"."parent_reaction_id" is not null and "reactions"."user_id" is not null;--> statement-breakpoint
-- Phase E: genau eines von beiden — Marke ODER Zuschauer-Konto.
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_brand_or_user_check" CHECK (("brand_id" IS NOT NULL) <> ("user_id" IS NOT NULL));
