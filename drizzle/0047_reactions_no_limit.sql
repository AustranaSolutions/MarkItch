DROP INDEX "reactions_solo_pitch_brand_top_level_unique_idx";--> statement-breakpoint
DROP INDEX "reactions_parent_reaction_brand_unique_idx";--> statement-breakpoint
DROP INDEX "reactions_solo_pitch_user_top_level_unique_idx";--> statement-breakpoint
DROP INDEX "reactions_parent_reaction_user_unique_idx";--> statement-breakpoint
CREATE INDEX "reactions_solo_pitch_idx" ON "reactions" USING btree ("solo_pitch_id");--> statement-breakpoint
CREATE INDEX "reactions_parent_reaction_idx" ON "reactions" USING btree ("parent_reaction_id");--> statement-breakpoint
CREATE INDEX "reactions_user_idx" ON "reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reactions_brand_idx" ON "reactions" USING btree ("brand_id");