import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getFollowingForBrand } from "@/lib/follow";
import { getT } from "@/lib/lang";

/** Phase 35: "wem folgt die Marke" — the counterpart to the followers list. */
export default async function BrandFollowingPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) notFound();

  const following = await getFollowingForBrand(brand.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-xl font-bold text-white">{t(`${brand.name} folgt`, `${brand.name} follows`)}</h1>
      {following.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Folgt noch niemandem.", "Not following anyone yet.")}</p>
      ) : (
        <ul className="space-y-1">
          {following.map((b) => (
            <li key={b.id}>
              <Link href={`/brands/${b.slug}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                  <img src={b.logoUrl} alt={b.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-white">{b.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
