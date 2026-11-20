import { getT } from "@/lib/lang";
import { EditBrandForm } from "@/components/brand/edit-brand-form";
import { BrandSettingsPage, requireOwnBrand } from "@/components/profile/brand-settings-page";

/** Luca 20.11.: „Name, Logo & Beschreibung“ — eigene Seite wie in der App. */
export default async function BrandDetailsPage() {
  const t = await getT();
  const brand = await requireOwnBrand();
  return (
    <BrandSettingsPage title={t("Name, Logo & Beschreibung", "Name, logo & description")}>
      <EditBrandForm
        logoUrl={brand.logoUrl}
        initialName={brand.name}
        initialDescription={brand.description ?? ""}
        initialCategory={brand.category}
        initialCountry={brand.country}
        initialWebsite={brand.website ?? ""}
      />
    </BrandSettingsPage>
  );
}
