import { LogoutButton } from "@/components/auth/logout-button";

// Phase 24: where requireUser()/getOptionalUser() send an already-logged-in
// but now-banned session (see src/lib/session.ts) — a dedicated page rather
// than silently redirecting to /login, so the reason is actually explained.
export default function GesperrtPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">Account gesperrt</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Dein Account wurde wegen eines Verstoßes gegen unsere Nutzungsbedingungen gesperrt. Wenn du glaubst, das ist
        ein Fehler, schreib uns an{" "}
        <a href="mailto:support@markitch.com" className="text-orange-400 hover:underline">
          support@markitch.com
        </a>
        .
      </p>
      <LogoutButton />
    </div>
  );
}
