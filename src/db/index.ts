import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// Luca 25.10.: Treiber `pg` (node-postgres) statt `postgres` (postgres.js).
//
// Ursache der Hänger („Server antwortet gerade nicht“, 24./25.10.): postgres.js
// schickt jede Abfrage mit Parametern in zwei Phasen — erst Parse + Describe + Flush,
// wartet auf die Antwort, dann Bind + Execute + Sync. Über Supabases Pooler
// (Supavisor, Transaktionsmodus) bleibt dabei unter Last die Datenbank-Verbindung
// zwischen den Phasen stehen („active / ClientRead“ in pg_stat_activity), die zweite
// Phase kommt nie an, und die Abfrage hängt bis zum Abbruch. Live gemessen auf
// Vercel mit dem echten Feed (5 gleichzeitige Aufbauten, 2 Runden, 3 Wiederholungen):
// postgres.js 30 von 30 Zeitüberschreitungen, pg 60 von 60 fertig in 40–450 ms —
// bei max 4 wie bei max 10 Verbindungen, die Datenbank selbst war die ganze Zeit
// untätig (CPU ~3 %). `pg` schickt Parse/Bind/Execute/Sync in einem Zug.
// Migrationen und Seed-Skripte nutzen weiter postgres.js (laufen einzeln, nicht im Pooler-Betrieb).
//
// Zeitgrenzen: kein Warten auf eine Verbindung länger als 10 s; Abfragen und
// Sperren brechen nach 10 s ab (werden von error.tsx / den Routen als Fehler gezeigt).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 20_000,
  statement_timeout: 10_000,
  lock_timeout: 10_000,
});

// Ohne diesen Handler würde ein Verbindungsabbruch einer ruhenden Verbindung den ganzen Prozess beenden.
pool.on("error", (err) => {
  console.error("[db] ruhende Verbindung abgebrochen:", err.message);
});

export const db = drizzle(pool, { schema });
