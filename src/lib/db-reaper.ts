import "server-only";
import postgres from "postgres";

/**
 * Luca 25.10.: Supabases Pooler (Supavisor, Transaktionsmodus) lässt Verbindungen
 * zurück, deren Client mitten in einer Abfrage verschwunden ist (Funktion beendet,
 * Neuaufbau des Pools, Deployment): in der Datenbank stehen sie dauerhaft auf
 * „active / ClientRead“. Sie belegen Pooler-Plätze, bis der Pool leer ist und neue
 * Abfragen ohne Antwort hängen (live gemessen: 5 solcher Verbindungen = Feed hängt).
 * Eine echte Abfrage wartet höchstens Millisekunden auf den Client — was länger
 * als 15 s so steht, ist tot und wird hier beendet.
 *
 * Läuft über den Session-Pooler (Port 5432, eigener Pool), damit es auch dann
 * durchkommt, wenn der Transaktions-Pool gerade voll von Zombies ist.
 */
let lastRun = 0;

export async function reapStuckBackends(minIntervalMs = 0): Promise<number> {
  if (Date.now() - lastRun < minIntervalMs) return 0;
  lastRun = Date.now();
  const url = new URL(process.env.DATABASE_URL!);
  url.port = "5432";
  const client = postgres(url.toString(), { prepare: false, max: 1, connect_timeout: 5, idle_timeout: 1 });
  try {
    const [row] = await client<{ n: number }[]>`
      select count(pg_terminate_backend(pid))::int as n
      from pg_stat_activity
      where datname = current_database()
        and usename = current_user
        and pid <> pg_backend_pid()
        and state = 'active'
        and wait_event_type = 'Client'
        and wait_event = 'ClientRead'
        and now() - state_change > interval '15 seconds'`;
    const n = row?.n ?? 0;
    if (n > 0) console.warn(`[db-reaper] ${n} hängende Datenbank-Verbindung(en) beendet`);
    return n;
  } catch (err) {
    console.error("[db-reaper] fehlgeschlagen", err);
    return 0;
  } finally {
    client.end({ timeout: 1 }).catch(() => {});
  }
}
