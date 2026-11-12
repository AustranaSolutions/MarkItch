ALTER TABLE "mobile_push_tokens" ADD COLUMN "language" text DEFAULT 'de' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message_en" text;