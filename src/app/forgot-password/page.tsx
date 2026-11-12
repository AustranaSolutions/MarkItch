import { AuthCard } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getT } from "@/lib/lang";

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <AuthCard title={t("Passwort vergessen", "Forgot password")} subtitle={t("Wir schicken dir einen Link zum Zurücksetzen.", "We’ll send you a link to reset it.")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
