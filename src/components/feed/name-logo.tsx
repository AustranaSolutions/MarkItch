/**
 * Luca 16.11. (Phasen-Map 1.2): Logo der Marke klein vor dem Namen unten links
 * im Video (Solo-Pitch und beide Seiten im Duell). Ohne Logo: nichts — dann
 * steht wie bisher nur der Name.
 */
export function NameLogo({ logoUrl, dimmed = false }: { logoUrl: string | null | undefined; dimmed?: boolean }) {
  if (!logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={logoUrl} alt="" className={`h-5 w-5 shrink-0 rounded-[5px] border border-white/35 object-cover ${dimmed ? "opacity-60" : ""}`} />
  );
}
