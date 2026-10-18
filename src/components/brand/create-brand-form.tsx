"use client";

import { useActionState, useState } from "react";
import { createBrand, type BrandFormState } from "@/app/actions/brand";
import { Field, FormError, SubmitButton } from "@/components/ui";
import { BrandCategories, BrandCountries, CreatorCategories } from "@/lib/validation";

const COUNTRY_LABELS: Record<(typeof BrandCountries)[number], string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  Other: "Andere",
};

export function CreateBrandForm() {
  const [state, action] = useActionState<BrandFormState, FormData>(createBrand, undefined);
  // Phase 23: controlled, same reason as register-form.tsx — this form has
  // enough fields that a single rejected one (e.g. missing category)
  // wiping everything else typed so far would be genuinely painful.
  // Luca 18.10.: Marke oder Creator — andere Texte und Kategorien.
  const [kind, setKind] = useState<"brand" | "creator">("brand");
  const categories: readonly string[] = kind === "creator" ? CreatorCategories : BrandCategories;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />

      <input type="hidden" name="kind" value={kind} />
      <div className="mb-4 flex gap-2">
        {(
          [
            ["brand", "Marke", "Unternehmen, Shop, Lokal"],
            ["creator", "Creator", "Influencer, Content Creator"],
          ] as const
        ).map(([value, title, text]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setKind(value);
              if (!(value === "creator" ? (CreatorCategories as readonly string[]) : (BrandCategories as readonly string[])).includes(category)) setCategory("");
            }}
            className={
              "flex-1 rounded-lg border p-3 text-left transition-colors " +
              (kind === value ? "border-orange-500 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500")
            }
          >
            <p className={"text-sm font-semibold " + (kind === value ? "text-orange-400" : "text-white")}>{title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{text}</p>
          </button>
        ))}
      </div>

      <Field
        label={kind === "creator" ? "Profilname" : "Markenname"}
        name="name"
        errors={state?.errors?.name}
        value={name}
        onChange={setName}
      />

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-300">
          Beschreibung (optional)
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
            Kategorie
          </label>
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
          >
            <option value="" disabled>
              Wählen…
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
            Land
          </label>
          <select
            id="country"
            name="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
          >
            <option value="" disabled>
              Wählen…
            </option>
            {BrandCountries.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_LABELS[c]}
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
          Logo (optional, PNG/JPEG/WEBP/SVG, max. 2 MB)
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

      <label className="mb-6 flex items-start gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="industryCompliance" required className="mt-1" />
        Ich bestätige, dass meine Marke keine Tabakwaren, E-Zigaretten, verschreibungspflichtigen
        Medikamente oder anderweitig rechtlich unzulässigen Produkte/Dienstleistungen bewirbt.
      </label>
      {state?.errors?.industryCompliance?.map((err) => (
        <p key={err} className="mb-4 -mt-4 text-sm text-red-400">
          {err}
        </p>
      ))}

      <SubmitButton>Marke veröffentlichen</SubmitButton>
    </form>
  );
}
