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
// fehlschlagen statt endlos zu hängen. Reicht aber allein nicht: `connect_timeout`
// greift nur, solange noch KEINE Verbindung steht — hängt stattdessen eine
// schon verbundene Query selbst (Lock, langsamer Join, o.ä.), läuft sie daran
// vorbei. `statement_timeout`/`lock_timeout` als Postgres-Session-Parameter
// decken genau diesen zweiten Fall ab. Beides zusammen wird dann von der
// bestehenden error.tsx/global-error.tsx aufgefangen ("nochmal versuchen"
// statt endlosem Spinner). Behebt nicht die zugrundeliegende Pool-Erschöpfung
// selbst (dafür müsste Vercels Function-Concurrency oder Supabases
// Pool-Größe untersucht werden), macht aus einem unsichtbaren Totalausfall
// aber einen sichtbaren, wiederholbaren Fehler.
const DATABASE_URL = process.env.DATABASE_URL;

function createClient() {
  return postgres(DATABASE_URL!, {
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max: 10,
    // Luca 25.10.: kein Pipelining (mehrere Abfragen ohne Warten über eine
    // Verbindung). Über Supabases Pooler (Transaktionsmodus) blieben so
    // geschickte Abfragen nach dessen Umstellung hängen — Datenbank wartete
    // im Zustand „active / ClientRead“, angemeldete Feeds bis zum Abbruch.
    max_pipeline: 1,
    connection: {
      statement_timeout: 10000,
      lock_timeout: 10000,
    },
  });
}

let client = createClient();
let current = drizzle(client, { schema });
let lastReset = 0;

/**
 * Luca 24.10. (Supabase-Störung): Nach einem Verbindungsabriss behielt der
 * Server einzelne tote Verbindungen im Pool — Abfragen darauf bekamen nie
 * eine Antwort (statement_timeout greift nicht, die Datenbank hat sie nie
 * erhalten), angemeldete Feeds hingen bis zum Abbruch. Hängt eine Abfrage
 * nachweislich (siehe feed.ts `timed`), wird der ganze Pool verworfen und neu
 * aufgebaut. Höchstens einmal pro 30 s, damit kein Dauer-Neuaufbau entsteht.
 */
export function resetDbConnections(reason: string): void {
  if (Date.now() - lastReset < 30_000) return;
  lastReset = Date.now();
  const old = client;
  client = createClient();
  current = drizzle(client, { schema });
  console.error(`[db] Verbindungen neu aufgebaut: ${reason}`);
  old.end({ timeout: 5 }).catch(() => {});
}

type Db = typeof current;

// Alle Module nutzen weiter `db` — es zeigt immer auf den aktuellen Pool.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const value = Reflect.get(current, prop, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
