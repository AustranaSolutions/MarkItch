import { AuthCard } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";
import { getLangSetting, getT } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export default async function LoginPage() {
  const t = await getT();
  return (
    <>
      <AuthCard title={t("Anmelden", "Log in")} subtitle={t("Willkommen zurück.", "Welcome back.")}>
        <LoginForm />
      </AuthCard>
      <LanguageSwitcher setting={await getLangSetting()} className="mx-auto -mt-8 mb-28 justify-center" />
    </>
  );
}
