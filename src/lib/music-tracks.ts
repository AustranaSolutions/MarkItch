// Luca 05.11.: Titel der MarkItch-Musikbibliothek (eigene GarageBand-Songs).
// Server und Browser lesen dieselbe Liste; Dateien unter public/music/,
// laufen als Schleife. Gleiche Liste liefert GET /api/mobile/music an die App.

/** `artist` steht klein unter dem Titel (Luca 05.11.: wer den Song gemacht hat, keine Stimmung). */
export type MusicTrack = { id: string; title: string; artist: string; url: string };

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "happy-werbung", title: "Happy Werbung", artist: "MarkItch", url: "/music/happy-werbung.m4a" },
  { id: "folk-house-drop", title: "Folk House Drop", artist: "MarkItch", url: "/music/folk-house-drop.m4a" },
  { id: "synthpop-euphoric-drop", title: "SynthPop Euphoric Drop", artist: "MarkItch", url: "/music/synthpop-euphoric-drop.m4a" },
];
