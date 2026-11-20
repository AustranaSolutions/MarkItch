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
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireAdminUser();
  const { tab: rawTab, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();
  const matches = (u: { name: string | null; email: string; brand: { name: string } | null }) =>
    !q || [u.name, u.email, u.brand?.name].some((v) => v?.toLowerCase().includes(q));
  const tab = (TABS.some((t) => t.key === rawTab) ? rawTab : "brand") as AdminUserGroup;
  const list = await listUsersForAdmin();
  const users = list.groups[tab].filter(matches);
  const tabHref = (key: string) => `/admin/users?tab=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">Nutzer</h1>
      <p className="mb-6 text-sm text-zinc-400">
        {list.total} registriert · {list.newLast7Days} neu in den letzten 7 Tagen
      </p>
      {/* Luca 20.11.: Suche über Name, E-Mail, Marke. */}
      <form action="/admin/users" className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={rawQ ?? ""}
          placeholder="Name, E-Mail oder Marke suchen"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
        />
        <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500">
          Suchen
        </button>
      </form>
      <div className="mb-4 flex border-b border-zinc-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`flex-1 border-b-2 pb-2 text-center text-sm font-semibold ${tab === t.key ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            {t.label} <span className="text-xs font-normal text-zinc-500">{list.groups[t.key].filter(matches).length}</span>
          </Link>
        ))}
      </div>
      {tab === "noProfile" && <p className="mb-3 text-xs text-zinc-500">Konten als Marke/Creator registriert, aber noch ohne angelegtes Profil.</p>}
      {users.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">{q ? "Niemand gefunden." : "Noch niemand."}</p>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {users.map((u) => (
            <li key={u.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">
                  <Link href={u.brand ? `/brands/${u.brand.slug}` : `/users/${u.id}`} className="hover:underline">
                    {u.brand?.name ?? u.name ?? "—"}
                  </Link>
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
