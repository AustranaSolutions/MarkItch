import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Luca 20.11. (Sicherheits-Check): fester Hash zum Vergleichen, wenn es die
// E-Mail nicht gibt — sonst antwortet der Login bei unbekannten Adressen
// messbar schneller und verrät, welche Adressen registriert sind.
// Hash eines zufälligen, verworfenen Passworts (Kosten 12 wie echte Hashes) — fest, damit der Kaltstart nicht rechnen muss.
const DUMMY_HASH = "$2b$12$gq0zfJwB7/JqSkUzy7WTiu6EwxDWwJ3DbRbAoX.m66zzXzwFRLUNq";

/** Wie verifyPassword, aber rechnet auch ohne Konto gleich lang (Ergebnis dann immer false). */
export async function verifyPasswordOrDummy(plain: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return Boolean(hash) && ok;
}
