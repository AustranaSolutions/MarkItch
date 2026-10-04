-- Sicherheit (04.10.2026, Supabase-Hinweis „rls_disabled_in_public“):
-- Row-Level Security auf allen Tabellen in „public“ einschalten, OHNE Policies.
-- Damit kann über die Supabase Data API (anon/authenticated) nichts mehr
-- gelesen oder geändert werden. Die App selbst greift als Tabellenbesitzer
-- per DATABASE_URL zu — Besitzer umgehen RLS (kein FORCE), es ändert sich nichts.
-- Konvention ab jetzt: jede neue Tabelle bekommt in ihrer Migration sofort
-- ENABLE ROW LEVEL SECURITY.

-- Schutz: Ist die Rolle dieser Verbindung NICHT Besitzer (oder BYPASSRLS),
-- würde RLS die App selbst aussperren → dann bricht die Migration ab, statt
-- die Live-Seite lahmzulegen.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' LOOP
    IF NOT (
      pg_has_role(current_user, t.tableowner, 'USAGE')
      OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user)
    ) THEN
      RAISE EXCEPTION 'RLS-Migration abgebrochen: % gehört %, nicht der App-Rolle %', t.tablename, t.tableowner, current_user;
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "public"."battle_reminders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."battles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."boosts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."brand_analytics_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."brand_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."casting_submissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."casting_votes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."creator_challenges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."creator_submissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."creator_votes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."email_verification_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."mobile_push_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."partner_castings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."rate_limit_hits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."solo_pitches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."visitor_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Falls es in Produktion weitere Tabellen in „public“ gibt (z. B. von Hand angelegt): ebenfalls.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END $$;
