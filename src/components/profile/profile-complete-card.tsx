"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

// Luca 25.10.: wie in der App (components/profile/profile-complete-card.tsx) —
// nur im eigenen Profil, zuerst zugeklappt, verschwindet, wenn alles erledigt ist.

type Step = { label: string; done: boolean; action: string; href: string };

export type ProfileCompleteInput = {
  creator: boolean;
  logoUrl: string | null;
  profileButtonType: string | null;
  locationType: string | null;
  description: string | null;
  imprint: string | null;
  introVideoUrl: string | null;
  bannerUrl: string | null;
};

function profileSteps(p: ProfileCompleteInput): Step[] {
  return [
    { label: "Logo", done: Boolean(p.logoUrl), action: "Hinzufügen", href: "/profile/settings" },
    {
      label: "Button im Profil & Standort",
      done: Boolean(p.profileButtonType) && (p.creator || Boolean(p.locationType)),
      action: "Einrichten",
      href: "/profile/settings/contact",
    },
    {
      label: p.creator ? "Info" : "Info & Impressum",
      done: Boolean(p.description) && (p.creator || Boolean(p.imprint)),
      action: "Ausfüllen",
      href: "/profile/settings/info",
    },
    { label: "Vorstellungsvideo", done: Boolean(p.introVideoUrl), action: "Aufnehmen", href: "/profile/settings/appearance" },
    { label: "Banner", done: Boolean(p.bannerUrl), action: "Hinzufügen", href: "/profile/settings/appearance" },
  ];
}

export function ProfileCompleteCard({ profile }: { profile: ProfileCompleteInput }) {
  const [open, setOpen] = useState(false);
  const steps = profileSteps(profile);
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  return (
    <div className="mb-4 rounded-2xl border border-orange-500/40 bg-orange-500/5 p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between">
        <span className="text-base font-bold text-white">Profil vervollständigen</span>
        <span className="flex items-center gap-2 text-sm font-bold text-orange-500">
          {doneCount}/{steps.length}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      {open && (
        <ul className="mt-3 space-y-1">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3 py-1.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${step.done ? "bg-orange-500 text-zinc-950" : "border-2 border-zinc-600"}`}
              >
                {step.done && <Check size={12} strokeWidth={3.5} />}
              </span>
              <span className={`flex-1 text-sm ${step.done ? "text-zinc-500" : "text-white"}`}>{step.label}</span>
              {!step.done && (
                <Link href={step.href} className="flex items-center text-sm font-bold text-orange-500 hover:underline">
                  {step.action}
                  <ChevronRight size={14} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
