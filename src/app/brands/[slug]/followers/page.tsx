import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getFollowersForBrand } from "@/lib/follow";
import { getT } from "@/lib/lang";

/** Phase 35: "wer folgt mir" — Luca: the follower count was there but never clickable. */
export default async function BrandFollowersPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) notFound();

  const followers = await getFollowersForBrand(brand.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-xl font-bold text-white">{t(`Follower von ${brand.name}`, `Followers of ${brand.name}`)}</h1>
      {followers.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Noch keine Follower.", "No followers yet.")}</p>
      ) : (
        <ul className="space-y-1">
          {followers.map((f) => {
            const row = (
              <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                  {f.label.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  {!f.link && <p className="text-xs text-zinc-500">{t("Zuschauer:in — kein eigenes Profil", "Viewer — no profile of their own")}</p>}
                </div>
              </div>
            );
            return <li key={f.userId}>{f.link ? <Link href={f.link}>{row}</Link> : row}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
