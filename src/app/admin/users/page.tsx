import Link from "next/link";
import { requireAdminUser } from "@/lib/moderation";
import { listUsersForAdmin, type AdminUserGroup } from "@/lib/admin-users";

const TABS: { key: AdminUserGroup; label: string }[] = [
  { key: "brand", label: "Marken" },
  { key: "creator", label: "Creator" },
  { key: "viewer", label: "Zuschauer" },
  { key: "noProfile", label: "Ohne Profil" },
];

/** Luca 20.11.: Nutzerliste — wer und wie viele registriert sind (wie in der App unter Admin › Nutzer). */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdminUser();
  const { tab: rawTab } = await searchParams;
  const tab = (TABS.some((t) => t.key === rawTab) ? rawTab : "brand") as AdminUserGroup;
  const list = await listUsersForAdmin();
  const users = list.groups[tab];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">Nutzer</h1>
      <p className="mb-6 text-sm text-zinc-400">
        {list.total} registriert · {list.newLast7Days} neu in den letzten 7 Tagen
      </p>
      <div className="mb-4 flex border-b border-zinc-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/users?tab=${t.key}`}
            className={`flex-1 border-b-2 pb-2 text-center text-sm font-semibold ${tab === t.key ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            {t.label} <span className="text-xs font-normal text-zinc-500">{list.groups[t.key].length}</span>
          </Link>
        ))}
      </div>
      {tab === "noProfile" && <p className="mb-3 text-xs text-zinc-500">Konten als Marke/Creator registriert, aber noch ohne angelegtes Profil.</p>}
      {users.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">Noch niemand.</p>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {users.map((u) => (
            <li key={u.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">
                  {u.brand ? (
                    <Link href={`/brands/${u.brand.slug}`} className="hover:underline">
                      {u.brand.name}
                    </Link>
                  ) : (
                    (u.name ?? "—")
                  )}
                </p>
                <span className="shrink-0 text-xs text-zinc-500">{new Date(u.createdAt).toLocaleDateString("de-AT")}</span>
              </div>
              <p className="truncate text-xs text-zinc-400">
                {u.brand && u.name ? `${u.name} · ` : ""}
                {u.email}
                {!u.emailVerified && <span className="text-yellow-400"> · E-Mail nicht bestätigt</span>}
                {u.banned && <span className="text-red-400"> · gesperrt</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
