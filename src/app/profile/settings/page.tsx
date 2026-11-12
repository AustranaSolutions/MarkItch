import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { LogoutButton } from "@/components/auth/logout-button";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { EditProfileForm } from "@/components/auth/edit-profile-form";
import { EditBrandForm } from "@/components/brand/edit-brand-form";
import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import { IncomingChallengeList, OutgoingChallengeList } from "@/components/challenge/challenge-list";
import { getIncomingChallenges, getOutgoingChallenges } from "@/lib/challenge";
import { getActiveCastingForBrand, getWonCastingsForBrand } from "@/lib/casting";
import { isAdminEmail } from "@/lib/moderation";
import { getLangSetting, getT } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { langOf, localeOf } from "@/lib/i18n";

/**
 * Phase 23: everything account-management-shaped that used to live on
 * /profile directly — see that page's own comment for the split rationale.
 * This is the "gear icon" destination, same convention as Instagram/TikTok.
 */
export default async function ProfileSettingsPage() {
  const t = await getT();
  const sessionUser = await requireUser();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);

  if (!user) {
    redirect("/api/auth/signout?callbackUrl=%2Flogin");
  }

  const brand = await getBrandForUser(sessionUser.id);
  const [incomingChallenges, outgoingChallenges, activeCasting, wonCastings] = await Promise.all([
    brand ? getIncomingChallenges(brand.id) : Promise.resolve([]),
    brand ? getOutgoingChallenges(brand.id) : Promise.resolve([]),
    brand ? getActiveCastingForBrand(brand.id) : Promise.resolve(null),
    brand ? getWonCastingsForBrand(brand.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/profile" aria-label={t("Zurück zum Profil", "Back to profile")} className="text-zinc-400 hover:text-white">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">{t("Einstellungen", "Settings")}</h1>
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Account</h2>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-zinc-400">{t("Rolle:", "Role:")}</span>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
            {user.accountType === "acro" ? "Acro" : "Assent"}
          </span>
          <span className="text-zinc-400">Status:</span>
          {user.emailVerifiedAt ? (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">{t("✓ Verifiziert", "✓ Verified")}</span>
          ) : (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
              {t("Nicht verifiziert", "Not verified")}
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-zinc-500">{t("Mitglied seit", "Member since")} {user.createdAt.toLocaleDateString(localeOf(langOf(t)))}</p>
        <EditProfileForm initialName={user.name ?? ""} initialEmail={user.email} initialAvatarUrl={user.avatarUrl} />
        {!user.emailVerifiedAt && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <ResendVerificationButton />
          </div>
        )}
      </div>

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("Marke", "Brand")}</h2>
          <EditBrandForm
            logoUrl={brand.logoUrl}
            initialName={brand.name}
            initialDescription={brand.description ?? ""}
            initialCategory={brand.category}
            initialCountry={brand.country}
            initialWebsite={brand.website ?? ""}
          />
          {/* Luca 25.10.: wie in der App — Profil-Teile auf eigenen Seiten. */}
          <div className="mt-6 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
            {[
              ["/profile/settings/appearance", "Banner & Vorstellung"],
              ["/profile/settings/contact", "Kontakt & Standort"],
              ["/profile/settings/info", "Info & Impressum"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="flex items-center justify-between px-4 py-3 text-sm text-white hover:bg-zinc-900">
                {label}
                <ChevronRight size={16} className="text-zinc-500" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Partner-Casting</h2>
          {wonCastings.length > 0 && (
            <p className="mb-3 text-sm text-orange-400">
              🏆 {t(`${brand.name} ist offizieller Partner bei ${wonCastings.length} ${wonCastings.length === 1 ? "Casting" : "Castings"}.`, `${brand.name} is the official partner in ${wonCastings.length} ${wonCastings.length === 1 ? "casting" : "castings"}.`)}
            </p>
          )}
          {activeCasting ? (
            <Link href={`/castings/${activeCasting.id}`} className="text-sm text-orange-500 hover:underline">
              {t("Läuft", "Live")}: „{activeCasting.prompt}“ {t("ansehen →", "view →")}
            </Link>
          ) : (
            <Link href="/post" className="text-sm text-orange-500 hover:underline">
              {t("+ Neues Casting starten", "+ Start a new casting")}
            </Link>
          )}
        </div>
      )}

      {brand && (
        <div id="einladungen" className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 scroll-mt-16">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("Einladungen", "Invites")}</h2>
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">{t("Eingehend", "Incoming")}</h3>
            <IncomingChallengeList challenges={incomingChallenges} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">{t("Gesendet", "Sent")}</h3>
            <OutgoingChallengeList challenges={outgoingChallenges} />
          </div>
        </div>
      )}

      {isAdminEmail(user.email) && (
        <div className="mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Admin</h2>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/admin/moderation" className="text-orange-400 hover:underline">
              Moderation →
            </Link>
            <Link href="/admin/brands" className="text-orange-400 hover:underline">
              Marken verifizieren →
            </Link>
            <Link href="/admin/boosts" className="text-orange-400 hover:underline">
              Boosts →
            </Link>
            <Link href="/admin/errors" className="text-orange-400 hover:underline">
              Fehler →
            </Link>
            <Link href="/admin/analytics" className="text-orange-400 hover:underline">
              Analytics →
            </Link>
          </div>
        </div>
      )}

      {/* Luca 12.11.: Sprache — Automatisch (Browser) / Deutsch / English. */}
      <div className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-sm text-white">
        {t("Sprache", "Language")}
        <LanguageSwitcher setting={await getLangSetting()} />
      </div>

      <Link
        href="/profile/settings/blocked"
        className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-sm text-white hover:bg-zinc-900"
      >
        {t("Blockierte Konten", "Blocked accounts")}
        <ChevronRight size={16} className="text-zinc-500" />
      </Link>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{t("Passwort ändern", "Change password")}</h2>
        <ChangePasswordForm />
      </div>

      <div className="mb-8 rounded-2xl border border-red-900/50 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{t("Account löschen", "Delete account")}</h2>
        <DeleteAccountForm hasBrand={Boolean(brand)} />
      </div>

      <div className="mb-8 flex justify-center gap-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">
          {t("Impressum", "Legal notice")}
        </Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">
          {t("Datenschutz", "Privacy")}
        </Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">
          {t("Nutzungsbedingungen", "Terms of Use")}
        </Link>
      </div>

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>
    </div>
  );
}
