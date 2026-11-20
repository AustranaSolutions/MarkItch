import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/settings/back-button";

// Luca 20.11.: Einstellungen im Web wie in der App — eine Liste mit
// Unterseiten (Gegenstück zu components/settings-rows.tsx in der App).

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      {title ? <h2 className="mb-2 ml-1 text-xs font-semibold uppercase text-zinc-500">{title}</h2> : null}
      <div className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">{children}</div>
    </section>
  );
}

const rowClass = "flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm hover:bg-zinc-900";

export function SettingsRow({ href, label, detail, danger }: { href: string; label: string; detail?: string | null; danger?: boolean }) {
  const external = href.startsWith("mailto:");
  const content = (
    <>
      <span className={danger ? "text-red-400" : "text-white"}>{label}</span>
      <span className="flex min-w-0 items-center gap-1 text-zinc-500">
        {detail ? <span className="truncate">{detail}</span> : null}
        <ChevronRight size={16} className="shrink-0" />
      </span>
    </>
  );
  return external ? (
    <a href={href} className={rowClass}>
      {content}
    </a>
  ) : (
    <Link href={href} className={rowClass}>
      {content}
    </Link>
  );
}

/** Rahmen einer Unterseite: Zurück-Pfeil, Titel, Inhalt (optional in einer Karte). */
export function SettingsPage({ title, back = "/profile/settings", card = true, children }: { title: string; back?: string; card?: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <BackButton fallback={back} />
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      {card ? <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">{children}</div> : children}
    </div>
  );
}

/** Die vier Bereiche des Profils — unter „Profil bearbeiten“ und in den Einstellungen (wie BrandProfileRows in der App). */
export function BrandProfileRows({ name, t }: { name?: string; t: (de: string, en: string) => string }) {
  return (
    <>
      <SettingsRow href="/profile/settings/brand" label={t("Name, Logo & Beschreibung", "Name, logo & description")} detail={name} />
      <SettingsRow href="/profile/settings/appearance" label={t("Banner & Vorstellungsvideo", "Banner & intro video")} />
      <SettingsRow href="/profile/settings/contact" label={t("Kontakt & Standort", "Contact & location")} />
      <SettingsRow href="/profile/settings/info" label={t("Info & Impressum", "Info & legal notice")} />
    </>
  );
}
