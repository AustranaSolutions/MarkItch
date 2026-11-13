import Link from "next/link";
import { getBannedUsers, getOpenReports, requireAdminUser } from "@/lib/moderation";
import { banUserAction, removeContentAction, resolveReportAction, unbanUserAction } from "@/app/actions/moderation";

const REMOVABLE_TYPES = new Set(["solo_pitch", "reaction", "comment", "battle_a", "battle_b", "casting_submission", "creator_submission"]);

/**
 * Phase 24: gated by ADMIN_EMAILS (see isAdminEmail), not a DB role — one
 * page, no need for a full permission system yet.
 */
export default async function ModerationPage() {
  await requireAdminUser();

  const [reports, bannedUsers] = await Promise.all([getOpenReports(), getBannedUsers()]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
        <Link href="/admin/boosts" className="text-sm text-zinc-500 hover:text-zinc-300">
          Boosts →
        </Link>
        <Link href="/admin/analytics" className="text-sm text-zinc-500 hover:text-zinc-300">
          Analytics →
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Offene Meldungen {reports.length > 0 && `(${reports.length})`}
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500">Keine offenen Meldungen.</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {r.targetHref ? (
                        <a href={r.targetHref} className="hover:underline" target="_blank" rel="noreferrer">
                          {r.targetLabel} ↗
                        </a>
                      ) : (
                        r.targetLabel
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Gemeldet von {r.reporterEmail} · {r.createdAt.toLocaleString("de-AT")}
                    </p>
                  </div>
                </div>
                <p className="mb-1 text-sm text-orange-400">{r.reason}</p>
                {r.note && <p className="mb-2 text-sm text-zinc-300">„{r.note}“</p>}
                {/* Luca 13.11.: genau der gemeldete Inhalt, direkt hier abspielbar. */}
                {r.targetVideoUrl && (
                  <video
                    src={r.targetVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="mt-2 aspect-[9/16] max-h-[60vh] rounded-lg bg-black"
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={resolveReportAction}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <button className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">
                      Als erledigt markieren
                    </button>
                  </form>

                  {REMOVABLE_TYPES.has(r.targetType) && (
                    <form action={removeContentAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="targetType" value={r.targetType} />
                      <input type="hidden" name="targetId" value={r.targetId} />
                      <button className="rounded-full border border-red-800 px-3 py-1 text-xs text-red-400 hover:border-red-600">
                        Inhalt entfernen
                      </button>
                    </form>
                  )}

                  {r.targetOwners.map((owner) => (
                    <form key={owner.userId} action={banUserAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="userId" value={owner.userId} />
                      <button className="rounded-full bg-red-900/60 px-3 py-1 text-xs text-red-200 hover:bg-red-900">
                        {owner.email} sperren
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Gesperrte Nutzer {bannedUsers.length > 0 && `(${bannedUsers.length})`}</h2>
        {bannedUsers.length === 0 ? (
          <p className="text-sm text-zinc-500">Niemand ist aktuell gesperrt.</p>
        ) : (
          <ul className="space-y-2">
            {bannedUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl border border-zinc-800 p-3">
                <div>
                  <p className="text-sm text-white">{u.email}</p>
                  <p className="text-xs text-zinc-500">Gesperrt seit {u.bannedAt?.toLocaleString("de-AT")}</p>
                </div>
                <form action={unbanUserAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">
                    Entsperren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
