import { LogoutButton } from "@/components/auth/logout-button";
import { getT } from "@/lib/lang";

// Phase 24: where requireUser()/getOptionalUser() send an already-logged-in
// but now-banned session (see src/lib/session.ts) — a dedicated page rather
// than silently redirecting to /login, so the reason is actually explained.
export default async function GesperrtPage() {
  const t = await getT();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{t("Account gesperrt", "Account suspended")}</h1>
      <p className="mb-6 text-sm text-zinc-400">
        {t(
          "Dein Account wurde wegen eines Verstoßes gegen unsere Nutzungsbedingungen gesperrt. Wenn du glaubst, das ist ein Fehler, schreib uns an",
          "Your account was suspended for violating our Terms of Use. If you think this is a mistake, email us at",
        )}{" "}
        <a href="mailto:support@markitch.com" className="text-orange-400 hover:underline">
          support@markitch.com
        </a>
        .
      </p>
      <LogoutButton />
    </div>
  );
}
