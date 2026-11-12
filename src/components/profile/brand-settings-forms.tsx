"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ban, ImagePlus, Trash2 } from "lucide-react";
import { BUTTON_ICONS } from "@/components/profile/brand-profile-header";
import { VideoPickerInput } from "@/components/video-picker-input";
import { PROFILE_BUTTON_TYPES, profileButtonLabel, type LocationType, type ProfileButtonType } from "@/lib/brand-details";
import { useT } from "@/components/i18n/lang-provider";
import { type Translate, langOf } from "@/lib/i18n";

// Luca 25.10.: Website = App. Gleiche drei Einstellungen wie in der App
// (settings/appearance, contact, info) über dieselbe Schnittstelle
// /api/mobile/brand/details (Login per Cookie gilt dort auch). Speichern → zurück.

type FieldErrors = Record<string, string[]>;

async function saveDetails(form: FormData, t: Translate): Promise<{ ok: true } | { error: string; fieldErrors: FieldErrors }> {
  try {
    const res = await fetch("/api/mobile/brand/details", { method: "PATCH", body: form });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: FieldErrors };
    return { error: data.error ?? t("Speichern fehlgeschlagen.", "Saving failed."), fieldErrors: data.fieldErrors ?? {} };
  } catch {
    return { error: t("Keine Verbindung — bitte nochmal versuchen.", "No connection — please try again."), fieldErrors: {} };
  }
}

function useSaveAndBack() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const save = async (form: FormData) => {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const result = await saveDetails(form, t);
    if ("ok" in result) {
      router.push("/profile/settings");
      router.refresh();
      return;
    }
    setSaving(false);
    setFieldErrors(result.fieldErrors);
    setError(Object.keys(result.fieldErrors).length ? null : result.error);
  };
  return { saving, error, fieldErrors, save };
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-orange-500";

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  errors,
  type = "text",
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  errors?: string[];
  type?: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={4} className={inputClass} />
      ) : (
        <input
          type={type === "url" ? "text" : type}
          inputMode={type === "url" ? "url" : type === "tel" ? "tel" : type === "email" ? "email" : undefined}
          autoCapitalize={type === "text" ? undefined : "none"}
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className={inputClass} />
      )}
      {errors?.map((err) => (
        <span key={err} className="mt-1 block text-sm text-red-400">
          {err}
        </span>
      ))}
    </label>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="mb-4 text-xs leading-relaxed text-zinc-500">{children}</p>;
const Section = ({ children }: { children: ReactNode }) => <h2 className="mb-2 mt-6 text-base font-bold text-white first:mt-0">{children}</h2>;

function SaveButton({ saving, disabled = false }: { saving: boolean; disabled?: boolean }) {
  const t = useT();
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      className="mt-2 w-full rounded-full bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40"
    >
      {saving ? t("Wird gespeichert…", "Saving…") : t("Speichern", "Save")}
    </button>
  );
}

const FormMessage = ({ message }: { message: string | null }) =>
  message ? <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{message}</p> : null;

// ——— Banner & Vorstellung ———

export function AppearanceForm({ bannerUrl, introVideoUrl }: { bannerUrl: string | null; introVideoUrl: string | null }) {
  const t = useT();
  const { saving, error, fieldErrors, save } = useSaveAndBack();
  // null = unverändert, "remove" = entfernen, sonst das neue Bild / Video.
  const [bannerDraft, setBannerDraft] = useState<File | "remove" | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [introDraft, setIntroDraft] = useState<string | "remove" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const shownBanner = bannerDraft === "remove" ? null : (bannerPreview ?? bannerUrl);
  const shownIntro = introDraft === "remove" ? null : (introDraft ?? introVideoUrl);
  const changed = bannerDraft !== null || introDraft !== null;

  const pickBanner = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t("Das Banner darf maximal 5 MB groß sein.", "The banner can be at most 5 MB."));
      return;
    }
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(URL.createObjectURL(file));
    setBannerDraft(file);
  };

  return (
    <form
      // Browser-Prüfung aus: „meinlokal.at“ ohne https:// ist erlaubt (der Server ergänzt und prüft).
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData();
        if (bannerDraft instanceof File) form.append("banner", bannerDraft);
        if (bannerDraft === "remove") form.append("removeBanner", "1");
        if (introDraft && introDraft !== "remove") form.append("introVideoUrl", introDraft);
        if (introDraft === "remove") form.append("removeIntro", "1");
        save(form);
      }}
    >
      <Section>Banner</Section>
      <Hint>{t("Das breite Bild oben im Profil, hinter deinem Logo. Ohne Banner zeigt dein Profil einen Farbverlauf. Querformat 2:1.", "The wide image at the top of your profile, behind your logo. Without a banner your profile shows a gradient. Landscape 2:1.")}</Hint>
      <label className="relative block aspect-[2/1] cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        {shownBanner ? (
          // eslint-disable-next-line @next/next/no-img-element -- Vorschau einer lokalen Datei bzw. eigenes Upload
          <img src={shownBanner} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-zinc-500">
            <ImagePlus size={22} />
            {t("Bild wählen (Querformat)", "Choose image (landscape)")}
          </span>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickBanner(e.target.files?.[0])} />
      </label>
      {fieldErrors.banner?.map((err) => (
        <p key={err} className="mt-1 text-sm text-red-400">
          {err}
        </p>
      ))}
      {shownBanner ? (
        <button
          type="button"
          onClick={() => {
            setBannerPreview(null);
            setBannerDraft(bannerUrl ? "remove" : null);
          }}
          className="mt-2 flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <Trash2 size={14} /> {t("Entfernen", "Remove")}
        </button>
      ) : null}

      <div className="my-6 h-px bg-zinc-800" />

      <Section>{t("Vorstellungsvideo", "Intro video")}</Section>
      <Hint>
        {t(
          "Stell dich kurz vor: wer ihr seid, was ihr macht und wo man euch findet — ideal 20 bis 60 Sekunden. Es erscheint als oranger Ring um dein Profilbild; antippen spielt es ab. Als Text darunter steht deine Beschreibung.",
          "Introduce yourself briefly: who you are, what you do and where to find you — ideally 20 to 60 seconds. It shows as an orange ring around your profile picture; tapping plays it. Your description appears as text below.",
        )}
      </Hint>
      {shownIntro ? (
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span className="flex-1 text-white">{introDraft ? t("Neues Video gewählt", "New video selected") : t("Aktuell hinterlegt", "Currently set")}</span>
          <a href={shownIntro} target="_blank" rel="noreferrer" className="font-bold text-orange-500 hover:underline">
            {t("Ansehen", "View")}
          </a>
          <button
            type="button"
            onClick={() => {
              setIntroDraft(introVideoUrl ? "remove" : null);
              setPickerKey((k) => k + 1);
            }}
            className="flex items-center gap-1 text-zinc-400 hover:text-white"
          >
            <Trash2 size={14} /> {t("Entfernen", "Remove")}
          </button>
        </div>
      ) : null}
      <VideoPickerInput
        key={pickerKey}
        folder="videos"
        urlFieldName="ignoredIntroVideoUrl"
        onUploadStateChange={({ uploading: busy, uploadedUrl }) => {
          setUploading(busy);
          if (uploadedUrl) setIntroDraft(uploadedUrl);
        }}
      />
      {fieldErrors.introVideoUrl?.map((err) => (
        <p key={err} className="mt-1 text-sm text-red-400">
          {err}
        </p>
      ))}

      <div className="mt-6">
        <FormMessage message={error} />
        <SaveButton saving={saving} disabled={!changed || uploading} />
      </div>
    </form>
  );
}

// ——— Kontakt & Standort ———

/** Was der gewählte Button als Ziel braucht — wie in der App (settings/contact.tsx). */
const LINK_HINTS = (t: Translate): Partial<Record<ProfileButtonType, { label: string; placeholder: string }>> => ({
  booking: { label: t("Link zur Terminbuchung", "Booking link"), placeholder: t("z. B. meinsalon.at/termin", "e.g. mysalon.com/booking") },
  reserve: { label: t("Link zum Reservieren oder zur Speisekarte", "Link to reservations or the menu"), placeholder: t("z. B. meinlokal.at/reservieren", "e.g. myrestaurant.com/reserve") },
  shop: { label: t("Link zum Shop", "Shop link"), placeholder: t("z. B. meinshop.at", "e.g. myshop.com") },
  app: { label: t("Link zur App (App Store)", "App link (App Store)"), placeholder: t("z. B. apps.apple.com/…", "e.g. apps.apple.com/…") },
  music: { label: t("Link zu deiner Musik", "Link to your music"), placeholder: "YouTube, Spotify, SoundCloud …" },
});

const LOCATION_OPTIONS = (t: Translate): [LocationType, string][] => [
  ["address", t("Mit Adresse", "With address")],
  ["area", t("Einsatzgebiet", "Service area")],
  ["online", "Online"],
];

export type ContactInitial = {
  creator: boolean;
  buttonType: ProfileButtonType;
  buttonUrl: string;
  phone: string;
  contactEmail: string;
  website: string;
  locationType: LocationType | "";
  locationLabel: string;
  address: string;
};

export function ContactForm({ initial }: { initial: ContactInitial }) {
  const t = useT();
  const { saving, error, fieldErrors, save } = useSaveAndBack();
  const [type, setType] = useState(initial.buttonType);
  const [link, setLink] = useState(initial.buttonUrl);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.contactEmail);
  const [website, setWebsite] = useState(initial.website);
  const [locationType, setLocationType] = useState<LocationType | "">(initial.locationType);
  const [locationLabel, setLocationLabel] = useState(initial.locationLabel);
  const [address, setAddress] = useState(initial.address);

  const linkHint = LINK_HINTS(t)[type];
  const missingTarget =
    (type === "call" && !phone.trim()) ||
    (type === "inquiry" && !email.trim()) ||
    (type === "website" && !website.trim()) ||
    (linkHint !== undefined && !link.trim());

  return (
    <form
      // Browser-Prüfung aus: „meinlokal.at“ ohne https:// ist erlaubt (der Server ergänzt und prüft).
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData();
        form.append("profileButtonType", type);
        // Den Link nur bei Link-Buttons mitschicken, sonst bleibt ein früherer erhalten.
        if (linkHint) form.append("profileButtonUrl", link);
        form.append("phone", phone);
        form.append("contactEmail", email);
        form.append("website", website);
        form.append("locationType", locationType);
        form.append("locationLabel", locationType === "online" ? "" : locationLabel);
        form.append("address", locationType === "address" ? address : "");
        save(form);
      }}
    >
      <Section>{t("Button im Profil", "Profile button")}</Section>
      <Hint>{t("Steht neben „Folgen“. Wähle, was deine Kund:innen am ehesten tun sollen.", "Appears next to “Follow”. Choose what your customers should most likely do.")}</Hint>
      <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup">
        {PROFILE_BUTTON_TYPES.map((key) => {
          const Icon = BUTTON_ICONS[key] ?? Ban;
          const on = type === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setType(key)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm text-white ${on ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}
            >
              <Icon size={15} className={on ? "text-orange-500" : ""} />
              {profileButtonLabel(key, langOf(t))}
            </button>
          );
        })}
      </div>
      {linkHint ? (
        <TextInput label={linkHint.label} value={link} onChange={setLink} placeholder={linkHint.placeholder} type="url" errors={fieldErrors.profileButtonUrl} />
      ) : null}
      {missingTarget ? <p className="mb-4 text-xs text-orange-400">{t("Ohne diesen Eintrag wird der Button noch nicht angezeigt.", "Without this entry the button won’t be shown yet.")}</p> : null}

      <Section>{t("Kontakt", "Contact")}</Section>
      <TextInput label={t("Telefonnummer", "Phone number")} value={phone} onChange={setPhone} type="tel" placeholder={t("z. B. 0316 123 456", "e.g. +43 316 123 456")} errors={fieldErrors.phone} />
      <TextInput label={t("E-Mail für Anfragen", "Email for inquiries")} value={email} onChange={setEmail} type="email" errors={fieldErrors.contactEmail} />
      <TextInput label="Website" value={website} onChange={setWebsite} type="url" errors={fieldErrors.website} />

      <Section>{t("Standort", "Location")}</Section>
      <div className="mb-4 flex rounded-full border border-zinc-800 p-1">
        {LOCATION_OPTIONS(t).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLocationType(key)}
            className={`flex-1 rounded-full py-1.5 text-sm ${locationType === key ? "bg-zinc-800 font-bold text-white" : "text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {fieldErrors.locationType?.map((err) => (
        <p key={err} className="mb-2 text-sm text-red-400">
          {err}
        </p>
      ))}
      {locationType === "address" ? (
        <>
          <TextInput label={t("Ort im Profil", "Location on profile")} value={locationLabel} onChange={setLocationLabel} placeholder={t("z. B. Graz-Eggenberg", "e.g. Graz-Eggenberg")} maxLength={60} errors={fieldErrors.locationLabel} />
          <TextInput label={t("Adresse", "Address")} value={address} onChange={setAddress} placeholder={t("Straße, PLZ Ort", "Street, postcode, city")} maxLength={200} errors={fieldErrors.address} />
          <Hint>{t("Im Profil steht nur der Ort. Die genaue Adresse sieht man unter ⋯ → Info, mit Link zur Karte.", "Your profile only shows the location. The exact address is under ⋯ → Info, with a link to the map.")}</Hint>
        </>
      ) : locationType === "area" ? (
        <TextInput label={t("Einsatzgebiet", "Service area")} value={locationLabel} onChange={setLocationLabel} placeholder={t("z. B. Graz und Umgebung", "e.g. Graz and surroundings")} maxLength={60} errors={fieldErrors.locationLabel} />
      ) : locationType === "online" ? (
        <Hint>{t("Im Profil steht „Online“ — ideal für Apps, Onlineshops und Dienste ohne Laden.", "Your profile shows “Online” — ideal for apps, online shops and services without a store.")}</Hint>
      ) : (
        <Hint>{initial.creator ? t("Freiwillig — eine Wohnadresse brauchst du nie anzugeben.", "Optional — you never need to give a home address.") : t("Damit Kund:innen sehen, wo sie dich finden.", "So customers can see where to find you.")}</Hint>
      )}

      <FormMessage message={error} />
      <SaveButton saving={saving} />
    </form>
  );
}

// ——— Info & Impressum ———

export function InfoForm({ creator, initial }: { creator: boolean; initial: { description: string; openingHours: string; imprint: string } }) {
  const t = useT();
  const { saving, error, fieldErrors, save } = useSaveAndBack();
  const [description, setDescription] = useState(initial.description);
  const [openingHours, setOpeningHours] = useState(initial.openingHours);
  const [imprint, setImprint] = useState(initial.imprint);

  return (
    <form
      // Browser-Prüfung aus: „meinlokal.at“ ohne https:// ist erlaubt (der Server ergänzt und prüft).
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData();
        form.append("description", description);
        form.append("openingHours", openingHours);
        form.append("imprint", imprint);
        save(form);
      }}
    >
      <TextInput
        label={t("Beschreibung", "Description")}
        value={description}
        onChange={setDescription}
        multiline
        maxLength={500}
        placeholder={creator ? t("Worum geht es bei dir?", "What are you about?") : t("Was macht ihr, was macht euch besonders?", "What do you do, what makes you special?")}
        errors={fieldErrors.description}
      />
      <Hint>{t("Steht unter ⋯ → Info und als Text im Vorstellungsvideo.", "Appears under ⋯ → Info and as text in the intro video.")}</Hint>
      {creator ? null : (
        <TextInput
          label={t("Öffnungszeiten (freiwillig)", "Opening hours (optional)")}
          value={openingHours}
          onChange={setOpeningHours}
          multiline
          maxLength={300}
          placeholder={t("z. B. Mo–Fr 7:30–17:00, Sa 8–12", "e.g. Mon–Fri 7:30–17:00, Sat 8–12")}
          errors={fieldErrors.openingHours}
        />
      )}
      <TextInput
        label={creator ? t("Impressum (falls du gewerblich postest)", "Legal notice (if you post commercially)") : t("Impressum", "Legal notice")}
        value={imprint}
        onChange={setImprint}
        multiline
        maxLength={1500}
        placeholder={t("Firmenname, Rechtsform\nAnschrift\nUID / Firmenbuchnummer\nKontakt", "Company name, legal form\nAddress\nVAT ID / company register number\nContact")}
        errors={fieldErrors.imprint}
      />
      <Hint>
        {t(
          "Unternehmen in Österreich müssen auch auf Social-Media-Profilen ihre Firmenangaben zeigen (§ 25 MedienG, § 5 ECG). Hier kannst du sie hinterlegen.",
          "Businesses in Austria must show their company details on social media profiles too (§ 25 MedienG, § 5 ECG). You can add them here.",
        )}
      </Hint>
      <FormMessage message={error} />
      <SaveButton saving={saving} />
    </form>
  );
}
