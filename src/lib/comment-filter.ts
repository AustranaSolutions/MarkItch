import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

// Phase F (Audit 04.10.): Kommentarfilter. Apple verlangt bei Apps mit
// Nutzerinhalten eine Methode, anstößige Inhalte herauszufiltern (App Review
// Guideline 1.2) — zusätzlich zu Melden/Blockieren, die es schon gibt. Der
// Filter greift beim Absenden, bevor etwas gespeichert wird:
// 1. Wortliste gegen Beleidigungen, Hetze und Bedrohungen (Deutsch/Englisch),
// 2. keine Links (Spam, Phishing — Marken haben ihren Link-Knopf am Video),
// 3. derselbe Text nicht mehrfach kurz hintereinander,
// 4. höchstens 30 Kommentare pro Stunde und Konto.
// Bewusst schlicht: lieber ein paar Wörter zu wenig als harmlose Kommentare
// fälschlich blockieren — der Rest läuft weiter über Melden.

export const MAX_COMMENT_LENGTH = 500;

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

/**
 * Ganze Wörter (nach Vereinfachung, siehe normalize). Nur Begriffe, die
 * praktisch nie harmlos vorkommen — mehrdeutige Wörter fehlen absichtlich.
 */
const BLOCKED_WORD_LIST = [
  // Deutsch — Beleidigungen
  "arschloch", "arschlöcher", "wichser", "wixer", "wichsa", "fotze", "fotzen", "hurensohn", "hurensöhne", "hurenkind",
  "missgeburt", "missgeburten", "spast", "spasti", "spastiker", "behindi", "schlampe", "schlampen", "nutte",
  "nutten", "drecksau", "dreckssau", "drecksack", "pisser", "bastard", "bastarde", "vollidiot", "vollpfosten",
  "wichskopf", "pimmelkopf", "schwuchtel", "schwuchteln", "transe", "kanake", "kanaken", "neger", "nigga", "zigeuner",
  "judensau", "untermensch", "untermenschen", "kinderficker", "ficker", "ficken", "fick", "fickt", "verpiss",
  // Englisch
  "fuck", "fucking", "fucker", "motherfucker", "fuckin", "cunt", "cunts", "bitch", "bitches", "asshole", "assholes",
  "dickhead", "retard", "retarded", "faggot", "faggots", "fag", "nigger", "niggers", "whore", "whores", "slut", "sluts",
  "kys", "pedo", "pedophile",
];

/** Feste Wendungen (auch über Wortgrenzen hinweg), z. B. Drohungen und Hetze. */
const BLOCKED_PHRASE_LIST = [
  "heil hitler",
  "sieg heil",
  "kill yourself",
  "bring dich um",
  "häng dich auf",
  "ich bring dich um",
  "ich töte dich",
  "vergasen",
];

/**
 * Lange, eindeutige Begriffe, die auch mit Leer- oder Sonderzeichen
 * dazwischen erkannt werden („h u r e n s o h n", „arsch-loch").
 */
const BLOCKED_SQUASHED_LIST = ["hurensohn", "arschloch", "missgeburt", "kinderficker", "motherfucker", "nigger", "faggot", "judensau"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normalize(text: string): string {
  return text
    .toLowerCase()
    // „Arschlöcher“ = „Arschloecher“: Umlaute einheitlich ausschreiben.
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1$1"); // „fuuuuck“ → „fuuck“, Doppelbuchstaben bleiben
}

const BLOCKED_WORDS = new Set(BLOCKED_WORD_LIST.map(normalize));
const BLOCKED_PHRASES = BLOCKED_PHRASE_LIST.map(normalize);
const BLOCKED_SQUASHED = BLOCKED_SQUASHED_LIST.map(normalize);

function containsBlockedLanguage(text: string): boolean {
  const normalized = normalize(text);
  const words = normalized.split(/[^\p{L}]+/u).filter(Boolean);
  // „F.U.C.K“ / „f u c k“: aufeinanderfolgende Einzelbuchstaben wieder zu einem Wort.
  const joinedLetters = normalized.match(/(?:\b\p{L}\b[^\p{L}]*){3,}/gu)?.map((run) => run.replace(/[^\p{L}]/gu, "")) ?? [];
  // „fuuck“ → zusätzlich mit einfachen Buchstaben prüfen.
  if ([...words, ...joinedLetters].some((w) => BLOCKED_WORDS.has(w) || BLOCKED_WORDS.has(w.replace(/(.)\1+/g, "$1")))) return true;
  const spaced = ` ${words.join(" ")} `;
  if (BLOCKED_PHRASES.some((p) => spaced.includes(` ${p}`))) return true;
  const squashed = words.join("");
  return BLOCKED_SQUASHED.some((w) => squashed.includes(w));
}

const LINK_PATTERN =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\s?(\.|\(dot\)|\[dot\])\s?(com|de|at|ch|net|org|io|shop|store|xyz|ly|me|info|biz|ru|top|app|link|site|online|gg|tk|cc|co)\b)/i;

function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

export type CommentCheck = { ok: true; content: string } | { ok: false; error: string };

/**
 * Prüft einen Kommentar vor dem Speichern. Gibt den bereinigten Text zurück
 * (getrimmt) — alle vier Kommentar-Wege (Duell, Solo-Pitch, Reaktion, Web-
 * Formular) gehen hier durch.
 */
export async function checkComment(userId: string, raw: unknown): Promise<CommentCheck> {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) return { ok: false, error: "Kommentar darf nicht leer sein." };
  if (content.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Kommentar darf maximal ${MAX_COMMENT_LENGTH} Zeichen lang sein.` };
  }
  if (containsBlockedLanguage(content)) {
    return { ok: false, error: "Dein Kommentar enthält Wörter, die hier nicht erlaubt sind. Bitte bleib respektvoll." };
  }
  if (containsLink(content)) {
    return { ok: false, error: "Links sind in Kommentaren nicht erlaubt." };
  }

  const [duplicate] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.content, content),
        gte(comments.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS)),
      ),
    )
    .limit(1);
  if (duplicate) return { ok: false, error: "Diesen Kommentar hast du gerade schon geschrieben." };

  const { allowed } = await checkRateLimit("comment", userId);
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  return { ok: true, content };
}
