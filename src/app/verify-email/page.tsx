import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { hashToken } from "@/lib/tokens";
import { AuthCard } from "@/components/ui";
import { getT } from "@/lib/lang";
import { type Translate } from "@/lib/i18n";
import { autoVerifyBrandsForUser } from "@/lib/brand-trust";

async function verify(token: string | undefined, t: Translate) {
  if (!token) return { ok: false, message: t("Kein Bestätigungslink angegeben.", "No confirmation link provided.") };

  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.expiresAt < new Date()) {
    return { ok: false, message: t("Der Link ist ungültig oder abgelaufen. Fordere in deinem Profil einen neuen an.", "This link is invalid or has expired. Request a new one in your profile.") };
  }

  await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, record.userId));
  // Luca 13.11. (Phase 4): passt die E-Mail-Domain zur Website der Marke → Haken.
  await autoVerifyBrandsForUser(record.userId).catch(() => {});

  return { ok: true, message: t("Deine E-Mail-Adresse wurde bestätigt.", "Your email address has been confirmed.") };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getT();
  const { token } = await searchParams;
  const result = await verify(token, t);

  return (
    <AuthCard title={t("E-Mail-Bestätigung", "Email confirmation")}>
      <p className={result.ok ? "text-green-400" : "text-red-400"}>{result.message}</p>
      <Link href={result.ok ? "/profile" : "/login"} className="mt-4 inline-block text-orange-500 hover:underline">
        {result.ok ? t("Zum Profil", "Go to profile") : t("Zur Anmeldung", "Go to login")}
      </Link>
    </AuthCard>
  );
}
