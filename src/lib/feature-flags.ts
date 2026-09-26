// Phase 48: Luca — Boost vorerst stilllegen, "anfangs sollte alles gratis
// sein, damit wir so viele User wie möglich in die App bekommen". Kein
// Server-only-Import (im Gegensatz zu boost.ts), damit auch Client-
// Komponenten wie feed-solo-pitch-card.tsx diese eine Stelle prüfen können,
// statt den Boost-Button separat zu verstecken. Einfach auf true stellen,
// sobald monetarisiert werden soll — Backend/Admin-Queue bleiben unverändert.
export const BOOST_ENABLED = false;
