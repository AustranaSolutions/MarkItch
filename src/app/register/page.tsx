import { AuthCard } from "@/components/ui";
import { RegisterForm } from "@/components/auth/register-form";
import { getT } from "@/lib/lang";

export default async function RegisterPage() {
  const t = await getT();
  return (
    <AuthCard title={t("Account erstellen", "Create account")} subtitle={t("MarkItch — Werbung wird zum Entertainment.", "MarkItch — advertising becomes entertainment.")}>
      <RegisterForm />
    </AuthCard>
  );
}
