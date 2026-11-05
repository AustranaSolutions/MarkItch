// Luca 05.11.: Titel der MarkItch-Musikbibliothek (eigene GarageBand-Songs).
// Server und Browser lesen dieselbe Liste; Dateien unter public/music/,
// laufen als Schleife. Gleiche Liste liefert GET /api/mobile/music an die App.

export type MusicTrack = { id: string; title: string; mood: string; url: string };

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "happy-werbung", title: "Happy Werbung", mood: "Fröhlich", url: "/music/happy-werbung.mp3" },
  { id: "folk-house-drop", title: "Folk House Drop", mood: "Gute Laune", url: "/music/folk-house-drop.mp3" },
  { id: "synthpop-euphoric-drop", title: "SynthPop Euphoric Drop", mood: "Energie", url: "/music/synthpop-euphoric-drop.mp3" },
];
