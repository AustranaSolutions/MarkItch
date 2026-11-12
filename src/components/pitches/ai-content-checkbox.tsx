"use client";

import { useT } from "@/components/i18n/lang-provider";
// Phase 46: EU-AI-Act-Kennzeichnungspflicht (Rechtskonformitäts-Audit) —
// im Gegensatz zu AudioRightsCheckbox optional/unchecked-by-default, kein
// Pflichtfeld. Die PDF gibt die Formulierung praktisch wörtlich vor.
export function AiContentCheckbox({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const t = useT();
  return (
    <label className="mb-4 flex items-start gap-2 text-sm text-zinc-300">
      <input type="checkbox" name="containsAiContent" defaultChecked={defaultChecked} className="mt-1" />
      {t(
        "Enthält dieses Video wesentlich KI-generierte oder manipulierte Bild-, Video- oder Audioinhalte?",
        "Does this video contain substantially AI-generated or manipulated images, video or audio?",
      )}
    </label>
  );
}
