CREATE TABLE "error_events" (
	"signature" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"detail" text,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_mailed_at" timestamp with time zone
);
--> statement-breakpoint
-- Konvention seit 0036: jede neue Tabelle sofort mit RLS (ohne Policies; die App ist Besitzer).
ALTER TABLE "error_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- In 0043 vergessen:
ALTER TABLE "video_thumbnails" ENABLE ROW LEVEL SECURITY;
