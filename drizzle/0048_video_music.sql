CREATE TABLE "video_music" (
	"video_url" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" text NOT NULL,
	"music_volume" integer DEFAULT 80 NOT NULL,
	"original_volume" integer DEFAULT 100 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_music" ADD CONSTRAINT "video_music_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Konvention seit 0036: jede neue Tabelle sofort mit RLS (ohne Policies; die App ist Besitzer).
ALTER TABLE "video_music" ENABLE ROW LEVEL SECURITY;
