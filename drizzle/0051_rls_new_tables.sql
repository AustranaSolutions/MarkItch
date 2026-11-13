-- Sicherheit (13.11.2026): RLS auch für Tabellen, die nach 0036 dazukamen
-- (video_thumbnails hatte es nicht). Ohne Policies → über die Supabase Data API
-- (anon/authenticated) ist nichts lesbar; die App greift als Tabellenbesitzer zu
-- und ist nicht betroffen. Die Schleife erfasst jede Tabelle in „public“, bei
-- der RLS noch aus ist — gleiche Schutzprüfung wie in 0036.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tablename, pg_get_userbyid(c.relowner) AS tableowner
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    IF NOT (
      pg_has_role(current_user, t.tableowner, 'USAGE')
      OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user)
    ) THEN
      RAISE EXCEPTION 'RLS-Migration abgebrochen: % gehört %, nicht der App-Rolle %', t.tablename, t.tableowner, current_user;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
