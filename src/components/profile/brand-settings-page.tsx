import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";

/** Luca 25.10.: gemeinsamer Rahmen der Profil-Einstellungen im Web (wie die Screens in der App). */
export async function requireOwnBrand() {
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) redirect("/profile/settings");
  return brand;
}

export function BrandSettingsPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/profile/settings" aria-label="Zurück zu den Einstellungen" className="text-zinc-400 hover:text-white">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">{children}</div>
    </div>
  );
}
