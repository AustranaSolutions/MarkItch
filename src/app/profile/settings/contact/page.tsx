import { ContactForm } from "@/components/profile/brand-settings-forms";
import { BrandSettingsPage, requireOwnBrand } from "@/components/profile/brand-settings-page";
import { defaultProfileButton, parseLocationType, parseProfileButtonType } from "@/lib/brand-details";

export default async function ContactSettingsPage() {
  const brand = await requireOwnBrand();
  return (
    <BrandSettingsPage title="Kontakt & Standort">
      <ContactForm
        initial={{
          creator: brand.kind === "creator",
          buttonType: parseProfileButtonType(brand.profileButtonType) ?? defaultProfileButton(brand.kind, brand.category),
          buttonUrl: brand.profileButtonUrl ?? "",
          phone: brand.phone ?? "",
          contactEmail: brand.contactEmail ?? "",
          website: brand.website ?? "",
          locationType: parseLocationType(brand.locationType) ?? "",
          locationLabel: brand.locationLabel ?? "",
          address: brand.address ?? "",
        }}
      />
    </BrandSettingsPage>
  );
}
