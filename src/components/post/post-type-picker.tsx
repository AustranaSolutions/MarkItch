"use client";

import { useState } from "react";
import Link from "next/link";
import { SoloPitchUploadForm } from "@/components/pitches/solo-pitch-upload-form";
import { OpenChallengeForm } from "@/components/creator-challenge/open-challenge-form";
import { StartCastingForm } from "@/components/casting/start-casting-form";

type PostType = "solo" | "creator" | "casting";

const TYPES: { key: PostType; label: string; hint: string }[] = [
  { key: "solo", label: "Solo-Pitch", hint: "Ein normales Video, kein Gegner nötig." },
  {
    key: "creator",
    label: "Creator-Challenge",
    hint: "Eröffne für einen Monat eine Challenge für deine Creator — die Videos laufen im Feed, die meisten Likes gewinnen.",
  },
  { key: "casting", label: "Partner-Casting", hint: "Ruf auf, einen neuen Markenpartner zu finden." },
];

export function PostTypePicker({
  challengePeriods,
  ownChallenges,
  activeCasting,
}: {
  challengePeriods: { period: string; label: string; taken: boolean }[];
  ownChallenges: { id: string; prompt: string; periodLabel: string }[];
  activeCasting: { id: string; prompt: string } | null;
}) {
  const [selected, setSelected] = useState<PostType>("solo");

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelected(t.key)}
            className={
              "rounded-lg border p-3 text-left transition-colors " +
              (selected === t.key ? "border-orange-500 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500")
            }
          >
            <p className={"text-sm font-semibold " + (selected === t.key ? "text-orange-400" : "text-white")}>{t.label}</p>
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-zinc-500">{TYPES.find((t) => t.key === selected)?.hint}</p>

      {selected === "solo" && <SoloPitchUploadForm />}
      {selected === "creator" && (
        <div>
          {ownChallenges.length > 0 && (
            <ul className="mb-4 space-y-2">
              {ownChallenges.map((c) => (
                <li key={c.id} className="rounded-lg border border-zinc-800 p-3 text-sm">
                  <Link href={`/challenges/${c.id}`} className="text-orange-400 hover:underline">
                    {c.periodLabel}: „{c.prompt}“ ansehen →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <OpenChallengeForm periods={challengePeriods} />
        </div>
      )}
      {selected === "casting" &&
        (activeCasting ? (
          <div className="rounded-lg border border-zinc-800 p-4 text-sm">
            <p className="mb-2 text-zinc-400">Du hast schon ein laufendes Casting:</p>
            <Link href={`/castings/${activeCasting.id}`} className="text-orange-400 hover:underline">
              „{activeCasting.prompt}“ ansehen →
            </Link>
          </div>
        ) : (
          <StartCastingForm />
        ))}
    </div>
  );
}
