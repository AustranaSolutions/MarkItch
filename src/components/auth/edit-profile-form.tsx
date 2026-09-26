"use client";

import { useActionState, useState } from "react";
import { updateProfile, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function EditProfileForm({
  initialName,
  initialEmail,
  initialAvatarUrl,
}: {
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, undefined);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const emailChanged = email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      {state?.success && (
        <FormSuccess
          message={emailChanged ? "Gespeichert — bestätige deine neue E-Mail-Adresse, der Link wurde verschickt." : "Gespeichert."}
        />
      )}
      <div className="mb-4">
        <label htmlFor="avatar" className="mb-1 block text-sm font-medium text-zinc-300">
          Profilbild (optional, PNG/JPEG/WEBP/SVG, max. 2 MB)
        </label>
        <div className="flex items-center gap-3">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
            <img src={avatarPreview} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-zinc-500">
              {(name || email).charAt(0).toUpperCase()}
            </div>
          )}
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAvatarPreview(URL.createObjectURL(file));
            }}
            className="flex-1 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
          />
        </div>
        {state?.errors?.avatar?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-400">
            {err}
          </p>
        ))}
      </div>
      <Field label="Name" name="name" required={false} errors={state?.errors?.name} value={name} onChange={setName} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        errors={state?.errors?.email}
        value={email}
        onChange={setEmail}
      />
      {emailChanged && (
        <p className="mb-4 text-xs text-yellow-400">
          Du änderst deine E-Mail-Adresse — dein Account gilt danach wieder als nicht verifiziert, bis du den neuen
          Bestätigungslink anklickst.
        </p>
      )}
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}
