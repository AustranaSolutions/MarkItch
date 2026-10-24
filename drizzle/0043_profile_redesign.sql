CREATE TABLE "video_thumbnails" (
	"video_url" text PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"user_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "profile_button_type" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "profile_button_url" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "location_type" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "location_label" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "opening_hours" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "imprint" text;--> statement-breakpoint
ALTER TABLE "video_thumbnails" ADD CONSTRAINT "video_thumbnails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;