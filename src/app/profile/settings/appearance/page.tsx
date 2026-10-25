import { AppearanceForm } from "@/components/profile/brand-settings-forms";
import { BrandSettingsPage, requireOwnBrand } from "@/components/profile/brand-settings-page";

export default async function AppearanceSettingsPage() {
  const brand = await requireOwnBrand();
  return (
    <BrandSettingsPage title="Banner & Vorstellung">
      <AppearanceForm bannerUrl={brand.bannerUrl} introVideoUrl={brand.videoUrl} />
    </BrandSettingsPage>
  );
}
