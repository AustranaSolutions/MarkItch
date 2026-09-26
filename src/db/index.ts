import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// One connection pool per server process. `prepare: false` is required for
// Supabase's pooled connection string (pgbouncer in transaction mode).
//
// Phase 48 (Notfall-Fix): `connect_timeout`/`idle_timeout`/`max` fehlten
// komplett — ohne das wartet postgres.js *für immer* auf eine freie
// Verbindung, wenn pgbouncers begrenzter Pool gerade ausgeschöpft ist. Live
// reproduziert: /brands/[slug] hing bei ca. 2 von 3 Aufrufen unbegrenzt fest
// ("Lädt…" nie fertig, curl --max-time 20 lief tatsächlich aus, HTML-Antwort
// bricht exakt an der Suspense-Stelle ab, die auf die DB-Query wartet) —
// kein Anzeige-/Router-Bug, sondern der Server selbst kam nie zu einer
// Antwort. `connect_timeout` lässt eine feststeckende Verbindung nach 10s
// fehlschlagen statt endlos zu hängen — wird dann von der bestehenden
// error.tsx/global-error.tsx aufgefangen ("nochmal versuchen" statt
// endlosem Spinner). Behebt nicht die zugrundeliegende Pool-Erschöpfung
// selbst (dafür müsste Vercels Function-Concurrency oder Supabases
// Pool-Größe untersucht werden), macht aus einem unsichtbaren Totalausfall
// aber einen sichtbaren, wiederholbaren Fehler.
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max: 10,
});

export const db = drizzle(client, { schema });
