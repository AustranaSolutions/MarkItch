import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getT } from "@/lib/lang";
import { getVerificationStatus } from "@/lib/brand-trust";
import { VerificationRequest } from "@/components/brand/verification-request";
import { SettingsPage } from "@/components/settings/settings-list";
import { requireOwnBrand } from "@/components/profile/brand-settings-page";

/** Luca 20.11.: „Konto verifizieren“ (vorher „Profil prüfen lassen“) — Haken per Code beantragen. */
export default async function VerifyPage() {
  const t = await getT();
  const brand = await requireOwnBrand();
  if (brand.verifiedAt) {
    return (
      <SettingsPage title={t("Konto verifizieren", "Verify account")}>
        <p className="flex items-center gap-2 text-sm text-white">
          <BadgeCheck size={20} className="text-sky-400" /> {t("Dein Konto ist verifiziert.", "Your account is verified.")}
        </p>
      </SettingsPage>
    );
  }
  const verification = await getVerificationStatus(brand.id);
  if (!verification) redirect("/profile/settings");
  return (
    <SettingsPage title={t("Konto verifizieren", "Verify account")}>
      <VerificationRequest
        code={verification.code}
        requestedUrl={verification.requestedUrl}
        defaultUrl={verification.website}
        isCreator={brand.kind === "creator"}
      />
    </SettingsPage>
  );
}
