"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  FileText,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
  Music,
  Phone,
  Play,
  Settings,
  Share2,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ProfileButtonType, PublicBrandDetails } from "@/lib/brand-details";

/**
 * Phase 32: shared by /profile (your own) and /brands/[slug] (anyone else's).
 *
 * Luca 24.10.: neues Profil wie in der App — Banner, Profilbild mit orangem
 * Ring (= Vorstellungsvideo, Klick spielt es ab), darunter nur Name,
 * Kategorie · Ort und die Zahlen; dann Folgen + „Button im Profil“ und
 * „Duell einladen“. Alles Weitere (Adresse, Kontakt, Impressum) über ⋯ → Info.
 */

const BUTTON_ICONS: Record<ProfileButtonType, LucideIcon | null> = {
  booking: CalendarDays,
  call: Phone,
  reserve: UtensilsCrossed,
  inquiry: Mail,
  shop: ShoppingBag,
  app: Smartphone,
  website: Globe,
  music: Music,
  none: null,
};

export type HeaderBrand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Hauptfarbe des Logos — Verlauf, wenn kein Banner hochgeladen ist. */
  accentColor: string;
  introVideoUrl: string | null;
  verified: boolean;
  kind: string;
  categoryLabel: string;
  locationType: string | null;
  locationLabel: string | null;
};

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function IntroPlayer({ brand, caption, onClose }: { brand: HeaderBrand; caption: string | null; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" role="dialog" aria-label="Vorstellungsvideo">
      <div className="relative h-full w-full max-w-md">
        <video
          src={brand.introVideoUrl ?? undefined}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
          onEnded={onClose}
        />
        <div className="absolute inset-x-0 top-0 p-3">
          <div className="h-[3px] overflow-hidden rounded bg-white/30">
            <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">{brand.name}</p>
              <p className="text-xs text-white/75">Vorstellung{duration ? ` · ${formatTime(duration)}` : ""}</p>
            </div>
            <button onClick={onClose} aria-label="Schließen" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        {caption && (
          <p className="absolute inset-x-0 bottom-0 line-clamp-4 p-5 text-lg font-bold leading-snug text-white [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoDialog({ brand, details, onClose }: { brand: HeaderBrand; details: PublicBrandDetails; onClose: () => void }) {
  const [imprintOpen, setImprintOpen] = useState(false);
  const websiteLabel = details.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const contact = details.phone || details.website || details.contactEmail || details.openingHours;
  const empty = !details.description && !details.address && !contact && !details.imprint && !brand.locationLabel;
  const row = "flex items-center gap-3 py-3 text-sm text-white";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="dialog" aria-label="Info">
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[var(--color-zinc-950,#0e2328)] p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">{brand.name}</h3>
          <button onClick={onClose} className="text-sm font-bold text-orange-500">
            Fertig
          </button>
        </div>
        <div className="space-y-3">
          {empty && <p className="py-6 text-center text-sm text-zinc-400">Noch keine Infos hinterlegt.</p>}
          {details.description && <p className="text-sm leading-relaxed text-zinc-300">{details.description}</p>}
          {details.address ? (
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(details.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${row} rounded-xl border border-zinc-800 bg-zinc-900/60 px-3`}
            >
              <MapPin size={16} />
              <span className="flex-1">{details.address}</span>
              <span className="font-bold text-orange-500">Karte</span>
            </a>
          ) : brand.locationLabel ? (
            <div className={`${row} rounded-xl border border-zinc-800 bg-zinc-900/60 px-3`}>
              <MapPin size={16} />
              {brand.locationLabel}
            </div>
          ) : null}
          {contact && (
            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3">
              {details.phone && (
                <a href={`tel:${details.phone.replace(/[^+0-9]/g, "")}`} className={row}>
                  <Phone size={16} /> {details.phone}
                </a>
              )}
              {details.website && (
                <a href={details.website} target="_blank" rel="noopener noreferrer" className={row}>
                  <Globe size={16} /> {websiteLabel}
                </a>
              )}
              {details.contactEmail && (
                <a href={`mailto:${details.contactEmail}`} className={row}>
                  <Mail size={16} /> {details.contactEmail}
                </a>
              )}
              {details.openingHours && (
                <div className={row}>
                  <Clock size={16} /> <span className="whitespace-pre-line">{details.openingHours}</span>
                </div>
              )}
            </div>
          )}
          {details.imprint && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3">
              <button onClick={() => setImprintOpen((o) => !o)} className={`${row} w-full text-left`}>
                <FileText size={16} /> <span className="flex-1">Impressum</span>
                <span className="text-zinc-500">{imprintOpen ? "−" : "+"}</span>
              </button>
              {imprintOpen && <p className="whitespace-pre-line pb-3 text-xs leading-relaxed text-zinc-400">{details.imprint}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BrandProfileHeader({
  brand,
  details,
  button,
  followerCount,
  followingCount,
  record,
  followersHref,
  followingHref,
  own = false,
  action,
  duelAction,
}: {
  brand: HeaderBrand;
  details: PublicBrandDetails;
  button: { type: ProfileButtonType; label: string; target: string } | null;
  followerCount: number;
  followingCount: number;
  record: { won: number; decided: number };
  followersHref: string;
  followingHref: string;
  own?: boolean;
  /** Folgen-Knopf (fremdes Profil, angemeldet) — der Button im Profil kommt automatisch daneben. */
  action?: ReactNode;
  /** „Duell einladen“ bzw. Hinweis auf offene Einladung — eigene Zeile darunter. */
  duelAction?: ReactNode;
}) {
  const [introOpen, setIntroOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasIntro = Boolean(brand.introVideoUrl);
  const ButtonIcon = button ? BUTTON_ICONS[button.type] : null;
  const external = button && !button.target.startsWith("tel:") && !button.target.startsWith("mailto:");

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const share = async () => {
    setMenuOpen(false);
    const url = `${window.location.origin}/brands/${brand.slug}`;
    if (navigator.share) {
      await navigator.share({ title: `${brand.name} auf MarkItch`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const profileLink = button && (
    <a
      href={button.target}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white hover:bg-zinc-900"
    >
      {ButtonIcon && <ButtonIcon size={15} />}
      {button.label}
    </a>
  );

  const avatar = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={brand.logoUrl} alt={brand.name} className="h-full w-full rounded-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-500">
      {brand.name.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="mb-6">
      {/* Menü liegt außerhalb des abgerundeten Banners, sonst schneidet overflow-hidden es ab. */}
      <div className="relative h-36">
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-zinc-900">
          {brand.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
            <img src={brand.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, #0e2328 0%, ${brand.accentColor}99 55%, ${brand.accentColor} 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#06171b]/80" />
        </div>
        <div className="absolute right-3 top-3 z-10" ref={menuRef}>
          {own ? (
            <Link href="/profile/settings" aria-label="Einstellungen" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <Settings size={18} />
            </Link>
          ) : (
            <>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Mehr"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white"
              >
                <MoreHorizontal size={20} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-sm shadow-xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoOpen(true);
                    }}
                    className="block w-full px-4 py-3 text-left text-white hover:bg-zinc-900"
                  >
                    Info
                  </button>
                  <button onClick={share} className="block w-full border-t border-zinc-800 px-4 py-3 text-left text-white hover:bg-zinc-900">
                    Profil teilen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="-mt-12 px-1">
        <button
          type="button"
          disabled={!hasIntro}
          onClick={() => setIntroOpen(true)}
          aria-label={hasIntro ? "Vorstellungsvideo ansehen" : undefined}
          className={`relative block h-24 w-24 rounded-full p-[3px] ${hasIntro ? "bg-orange-500" : ""}`}
        >
          <span className="block h-full w-full rounded-full bg-[#06171b] p-[3px]">{avatar}</span>
          {hasIntro && (
            <span className="absolute -right-0.5 bottom-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#06171b] bg-orange-500 pl-0.5">
              <Play size={11} className="fill-[#0e2328] text-[#0e2328]" />
            </span>
          )}
        </button>

        <h2 className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-white">
          {brand.name}
          {brand.verified && <BadgeCheck size={20} className="fill-sky-400 text-[#06171b]" aria-label="Verifiziert" />}
        </h2>
        <button type="button" onClick={() => setInfoOpen(true)} className="mt-1 flex flex-wrap items-center gap-1 text-left text-sm text-zinc-400">
          {brand.kind === "creator" ? "Creator · " : ""}
          {brand.categoryLabel}
          {brand.locationLabel && (
            <>
              <span> · </span>
              {brand.locationType === "online" ? <Globe size={13} /> : <MapPin size={13} />}
              <span className="text-zinc-300">{brand.locationLabel}</span>
            </>
          )}
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-zinc-500">
          <Link href={followersHref} className="hover:opacity-80">
            <span className="font-bold text-white">{followerCount}</span> Follower
          </Link>
          <span>·</span>
          <Link href={followingHref} className="hover:opacity-80">
            <span className="font-bold text-white">{followingCount}</span> Folgt
          </Link>
          {record.decided > 0 && (
            <>
              <span>·</span>
              <span>
                <span className="font-bold text-white">
                  {record.won}/{record.decided}
                </span>{" "}
                Duelle gewonnen
              </span>
            </>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {own ? (
            <div className="flex gap-2">
              <Link
                href="/profile/settings"
                className="flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-sm font-bold text-white hover:bg-zinc-900"
              >
                Profil bearbeiten
              </Link>
              {/* Luca 24.10.: den eigenen Button im Profil auch selbst sehen — Teilen dann nur als Symbol. */}
              {button && profileLink}
              <button
                onClick={share}
                aria-label="Profil teilen"
                className={`flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 text-sm font-bold text-white hover:bg-zinc-900 ${button ? "w-10" : "w-32"}`}
              >
                <Share2 size={15} /> {button ? null : copied ? "Kopiert ✓" : "Teilen"}
              </button>
            </div>
          ) : (
            <>
              {(action || button) && (
                <div className="flex gap-2 [&>*]:flex-1">
                  {action}
                  {button && profileLink}
                </div>
              )}
              {duelAction}
              {copied && <p className="text-xs text-zinc-400">Link kopiert ✓</p>}
            </>
          )}
        </div>
      </div>

      {introOpen && brand.introVideoUrl && <IntroPlayer brand={brand} caption={details.description} onClose={() => setIntroOpen(false)} />}
      {infoOpen && <InfoDialog brand={brand} details={details} onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
