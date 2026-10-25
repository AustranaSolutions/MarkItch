import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { errorEvents } from "@/db/schema";
import { requireAdminUser } from "@/lib/moderation";

const SOURCE_LABELS: Record<string, string> = { server: "Server", web: "Website", app: "App" };

async function resolveErrorAction(formData: FormData) {
  "use server";
  await requireAdminUser();
  const signature = String(formData.get("signature") ?? "");
  if (signature) await db.delete(errorEvents).where(eq(errorEvents.signature, signature));
  revalidatePath("/admin/errors");
}

/** Luca 25.10.: Fehler-Alarm (lib/error-alerts.ts) — gleiche Fehler zusammengezählt, neueste oben. */
export default async function ErrorsAdminPage() {
  await requireAdminUser();
  const rows = await db.select().from(errorEvents).orderBy(desc(errorEvents.lastSeenAt)).limit(100);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-2 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Fehler</h1>
        <Link href="/admin/moderation" className="text-sm text-zinc-500 hover:text-zinc-300">
          Moderation →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Fehler aus Server, Website und App. Bei einem neuen Fehler kommt eine Mail an die Admin-Adressen (höchstens einmal pro Stunde je
        Fehler). „Erledigt“ entfernt den Eintrag; tritt er wieder auf, kommt wieder eine Mail.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Keine Fehler. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.signature} className="rounded-xl border border-zinc-800 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-300">{SOURCE_LABELS[row.source] ?? row.source}</span>
                <span>{row.count}×</span>
                <span>zuletzt {row.lastSeenAt.toLocaleString("de-AT", { timeZone: "Europe/Vienna" })}</span>
              </div>
              <p className="mb-2 break-words text-sm font-semibold text-white">{row.message}</p>
              {row.detail ? (
                <details className="mb-3">
                  <summary className="cursor-pointer text-xs text-zinc-500">Details</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-400">{row.detail}</pre>
                </details>
              ) : null}
              <form action={resolveErrorAction}>
                <input type="hidden" name="signature" value={row.signature} />
                <button className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">Erledigt</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
