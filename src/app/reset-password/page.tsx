import { AuthCard } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getT } from "@/lib/lang";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getT();
  const { token } = await searchParams;

  return (
    <AuthCard title={t("Neues Passwort", "New password")} subtitle={t("Wähle ein neues Passwort für deinen Account.", "Choose a new password for your account.")}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-red-400">{t("Kein gültiger Link. Bitte fordere einen neuen Reset-Link an.", "Invalid link. Please request a new reset link.")}</p>
      )}
    </AuthCard>
  );
}
