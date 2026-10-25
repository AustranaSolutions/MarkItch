import { InfoForm } from "@/components/profile/brand-settings-forms";
import { BrandSettingsPage, requireOwnBrand } from "@/components/profile/brand-settings-page";

export default async function InfoSettingsPage() {
  const brand = await requireOwnBrand();
  return (
    <BrandSettingsPage title="Info & Impressum">
      <InfoForm
        creator={brand.kind === "creator"}
        initial={{ description: brand.description ?? "", openingHours: brand.openingHours ?? "", imprint: brand.imprint ?? "" }}
      />
    </BrandSettingsPage>
  );
}
