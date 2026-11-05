// Phase 46: shared by every fresh video upload with sound (Solo-Pitch,
// Duell-Video, Reaktion, Creator-Video, Casting-Einreichung) — Rechts-
// konformitäts-Audit (Übergabe Phase 45): das größte rechtliche Risiko für
// Video-Plattformen sind Urheberrechtsverletzungen durch Musik im
// Hintergrund. Eine echte Lizenzbibliothek (Epidemic Sound o. ä.) ist eine
// laufende, kostenpflichtige Abhängigkeit — bewusst NICHT ohne Rückfrage
// eingebaut. Diese AGB-Bestätigung ist die PDF's eigene erste, sofort
// umsetzbare Option ("Rechtliche Freistellung (AGB)") und schützt die
// Plattform rechtlich, ohne selbst Audio zu analysieren oder zu entfernen.
// Luca 05.11.: Die eigene MarkItch-Musikbibliothek ist inzwischen da (lib/music-tracks.ts);
// der Freistellungs-Satz steht nur noch in den Nutzungsbedingungen, nicht doppelt hier.
export function AudioRightsCheckbox({ errors }: { errors?: Record<string, string[]> }) {
  return (
    <div className="mb-4">
      {/* Luca 25.10.: Pilot-Marken posten fertige Werbevideos — Musik aus anderen Apps ist dort lizenziert, hier nicht. */}
      <p className="mb-2 text-xs text-zinc-400">Bitte keine Musik aus Instagram, TikTok & Co. – sie ist nur dort lizenziert und darf auf MarkItch nicht verwendet werden. Für Musik unter deinem Video nimm einen Titel aus der MarkItch-Bibliothek (bei „Musik“).</p>
      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="audioRightsConfirmed" required className="mt-1" />
        Mein Video enthält keine fremde Musik, oder ich darf den Ton verwenden (z. B. weil ich selbst spreche, Musik aus der MarkItch-Bibliothek nutze oder die Musik selbst lizenziert habe).
      </label>
      {errors?.audioRightsConfirmed?.map((err) => (
        <p key={err} className="mt-1 text-sm text-red-400">
          {err}
        </p>
      ))}
    </div>
  );
}
