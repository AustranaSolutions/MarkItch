// Phase 48: Luca — Boost vorerst stilllegen, "anfangs sollte alles gratis
// sein, damit wir so viele User wie möglich in die App bekommen". Kein
// Server-only-Import (im Gegensatz zu boost.ts), damit auch Client-
// Komponenten wie feed-solo-pitch-card.tsx diese eine Stelle prüfen können,
// statt den Boost-Button separat zu verstecken. Einfach auf true stellen,
// sobald monetarisiert werden soll — Backend/Admin-Queue bleiben unverändert.
export const BOOST_ENABLED = false;

// Luca 17.10. (Phase W): Website = Begleit-Seite zur App. App Store ID aus
// App Store Connect (App „MarkItch“). Auf true stellen, sobald die App im
// App Store veröffentlicht ist — vorher zeigt /app „Bald im App Store“.
export const APP_STORE_ID = "6823294434";
export const APP_STORE_LIVE = false;
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
