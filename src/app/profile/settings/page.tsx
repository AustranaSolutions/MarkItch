import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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

/**
 * Phase 23: everything account-management-shaped that used to live on
 * /profile directly — see that page's own comment for the split rationale.
 * This is the "gear icon" destination, same convention as Instagram/TikTok.
 */
export default async function ProfileSettingsPage() {
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
        <Link href="/profile" aria-label="Zurück zum Profil" className="text-zinc-400 hover:text-white">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Account</h2>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-zinc-400">Rolle:</span>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
            {user.accountType === "acro" ? "Acro" : "Assent"}
          </span>
          <span className="text-zinc-400">Status:</span>
          {user.emailVerifiedAt ? (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">✓ Verifiziert</span>
          ) : (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
              Nicht verifiziert
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-zinc-500">Mitglied seit {user.createdAt.toLocaleDateString("de-AT")}</p>
        <EditProfileForm initialName={user.name ?? ""} initialEmail={user.email} initialAvatarUrl={user.avatarUrl} />
        {!user.emailVerifiedAt && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <ResendVerificationButton />
          </div>
        )}
      </div>

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Marke</h2>
          <EditBrandForm
            logoUrl={brand.logoUrl}
            initialName={brand.name}
            initialDescription={brand.description ?? ""}
            initialCategory={brand.category}
            initialCountry={brand.country}
            initialWebsite={brand.website ?? ""}
          />
        </div>
      )}

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Partner-Casting</h2>
          {wonCastings.length > 0 && (
            <p className="mb-3 text-sm text-orange-400">
              🏆 {brand.name} ist offizieller Partner bei {wonCastings.length} {wonCastings.length === 1 ? "Casting" : "Castings"}.
            </p>
          )}
          {activeCasting ? (
            <Link href={`/castings/${activeCasting.id}`} className="text-sm text-orange-500 hover:underline">
              Läuft: „{activeCasting.prompt}“ ansehen →
            </Link>
          ) : (
            <Link href="/post" className="text-sm text-orange-500 hover:underline">
              + Neues Casting starten
            </Link>
          )}
        </div>
      )}

      {brand && (
        <div id="einladungen" className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 scroll-mt-16">
          <h2 className="mb-4 text-lg font-semibold text-white">Einladungen</h2>
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Eingehend</h3>
            <IncomingChallengeList challenges={incomingChallenges} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Gesendet</h3>
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
            <Link href="/admin/boosts" className="text-orange-400 hover:underline">
              Boosts →
            </Link>
            <Link href="/admin/analytics" className="text-orange-400 hover:underline">
              Analytics →
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Passwort ändern</h2>
        <ChangePasswordForm />
      </div>

      <div className="mb-8 rounded-2xl border border-red-900/50 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Account löschen</h2>
        <DeleteAccountForm hasBrand={Boolean(brand)} />
      </div>

      <div className="mb-8 flex justify-center gap-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">
          Datenschutz
        </Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">
          Nutzungsbedingungen
        </Link>
      </div>

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>
    </div>
  );
}
