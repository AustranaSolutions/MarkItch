import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { SettingsPage } from "@/components/settings/settings-list";

/** Luca 25.10.: gemeinsamer Rahmen der Profil-Einstellungen im Web (wie die Screens in der App). */
export async function requireOwnBrand() {
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) redirect("/profile/settings");
  return brand;
}

export async function BrandSettingsPage({ title, children }: { title: string; children: ReactNode }) {
  return <SettingsPage title={title} back="/profile/edit">{children}</SettingsPage>;
}
