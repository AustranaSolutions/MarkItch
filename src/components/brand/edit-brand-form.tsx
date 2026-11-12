"use client";

import { useActionState, useState } from "react";
import { updateBrand, type UpdateBrandFormState } from "@/app/actions/brand";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { BrandCategories, BrandCountries } from "@/lib/validation";
import { useT } from "@/components/i18n/lang-provider";
import { categoryLabel } from "@/lib/brand-details";
import { countryLabel, langOf } from "@/lib/i18n";


/**
 * Phase 43: the brand itself (name/description/category/website/logo) had
 * no edit form anywhere — CreateBrandForm only ever ran once, at creation.
 * Same fields, same validation, pre-filled with the brand's current values.
 */
export function EditBrandForm({
  logoUrl,
  initialName,
  initialDescription,
  initialCategory,
  initialCountry,
  initialWebsite,
}: {
  logoUrl: string | null;
  initialName: string;
  initialDescription: string;
  initialCategory: string;
  initialCountry: string;
  initialWebsite: string;
}) {
  const t = useT();
  const [state, action] = useActionState<UpdateBrandFormState, FormData>(updateBrand, undefined);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory);
  const [country, setCountry] = useState(initialCountry);
  const [website, setWebsite] = useState(initialWebsite);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      {state?.success && <FormSuccess message={t("Gespeichert.", "Saved.")} />}

      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
        <img src={logoUrl} alt={name} className="mb-4 h-16 w-16 rounded-xl object-cover" />
      )}

      <Field label={t("Markenname", "Brand name")} name="name" errors={state?.errors?.name} value={name} onChange={setName} />

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-300">
          {t("Beschreibung (optional)", "Description (optional)")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
        />
        {state?.errors?.description?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-zinc-300">
            {t("Kategorie", "Category")}
          </label>
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
          >
            {BrandCategories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat, langOf(t))}
              </option>
            ))}
          </select>
          {state?.errors?.category?.map((err) => (
            <p key={err} className="mt-1 text-sm text-red-400">
              {err}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-zinc-300">
            {t("Land", "Country")}
          </label>
          <select
            id="country"
            name="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
          >
            {BrandCountries.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c, t)}
              </option>
            ))}
          </select>
          {state?.errors?.country?.map((err) => (
            <p key={err} className="mt-1 text-sm text-red-400">
              {err}
            </p>
          ))}
        </div>
      </div>

      <Field
        label="Website (optional)"
        name="website"
        type="url"
        required={false}
        errors={state?.errors?.website}
        value={website}
        onChange={setWebsite}
      />

      <div className="mb-6">
        <label htmlFor="logo" className="mb-1 block text-sm font-medium text-zinc-300">
          {t("Logo ändern (optional, PNG/JPEG/WEBP/SVG, max. 2 MB)", "Change logo (optional, PNG/JPEG/WEBP/SVG, max. 2 MB)")}
        </label>
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
        />
        {state?.errors?.logo?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-400">
            {err}
          </p>
        ))}
      </div>

      <SubmitButton>{t("Speichern", "Save")}</SubmitButton>
    </form>
  );
}
