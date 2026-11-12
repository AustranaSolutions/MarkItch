import Link from "next/link";
import { effectiveStatus, type ChallengeWithBrand } from "@/lib/challenge";
import { RespondButtons, CancelChallengeButton } from "@/components/challenge/respond-buttons";
import { getT } from "@/lib/lang";
import { type Translate, duelCategoryLabel, langOf } from "@/lib/i18n";

const STATUS_LABEL = (t: Translate): Record<string, string> => ({
  pending: t("Wartet auf Antwort", "Awaiting reply"),
  accepted: t("Angenommen", "Accepted"),
  declined: t("Abgelehnt", "Declined"),
  expired: t("Abgelaufen", "Expired"),
  cancelled: t("Zurückgezogen", "Withdrawn"),
});

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  accepted: "bg-green-500/10 text-green-400",
  declined: "bg-zinc-800 text-zinc-400",
  expired: "bg-zinc-800 text-zinc-500",
  cancelled: "bg-zinc-800 text-zinc-500",
};

async function StatusBadge({ status, battleId }: { status: string; battleId?: string | null }) {
  const t = await getT();
  if (status === "accepted" && battleId) {
    return (
      <Link
        href={`/pitches/${battleId}`}
        className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
      >
        {t("Pitch ansehen →", "View pitch →")}
      </Link>
    );
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL(t)[status]}
    </span>
  );
}

/** "Noch 12 Tage" once there's more than a day left, "Noch 6h" once it's close. */
function timeLeftLabel(expiresAt: Date, t: Translate): string {
  const msLeft = Math.max(0, expiresAt.getTime() - Date.now());
  const hoursLeft = msLeft / (60 * 60 * 1000);
  if (hoursLeft >= 24) {
    return t(`Noch ${Math.ceil(hoursLeft / 24)} Tage`, `${Math.ceil(hoursLeft / 24)} days left`);
  }
  return t(`Noch ${Math.max(1, Math.ceil(hoursLeft))}h`, `${Math.max(1, Math.ceil(hoursLeft))}h left`);
}

function BrandChip({ brand }: { brand: ChallengeWithBrand["otherBrand"] }) {
  return (
    <Link href={`/brands/${brand.slug}`} className="flex items-center gap-2 hover:opacity-80">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
        <img src={brand.logoUrl} alt={brand.name} className="h-8 w-8 rounded-lg object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-500">
          {brand.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-medium text-white">{brand.name}</span>
    </Link>
  );
}

export async function IncomingChallengeList({ challenges }: { challenges: ChallengeWithBrand[] }) {
  const t = await getT();
  if (challenges.length === 0) {
    return <p className="text-sm text-zinc-500">{t("Noch keine Einladungen erhalten.", "No invites received yet.")}</p>;
  }
  return (
    <ul className="space-y-3">
      {challenges.map((c) => {
        const status = effectiveStatus(c);
        return (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3">
            <div>
              <BrandChip brand={c.otherBrand} />
              {c.category ? <p className="mt-1 text-xs text-zinc-400">{duelCategoryLabel(c.category, langOf(t))}</p> : null}
              {/* RN-7: Einladung auf einen Solo-Pitch / mit mitgeschicktem Video (bleibt verdeckt). */}
              {c.soloPitchId && <p className="mt-1 text-xs text-zinc-400">{t("Auf deinen Solo-Pitch — dein Video ist schon drin.", "On your solo pitch — your video is already in.")}</p>}
              {c.challengerVideoUrl && (
                <p className="mt-1 text-xs text-orange-300">{t(`Video von ${c.otherBrand.name} liegt bereit (verdeckt bis zum Start).`, `${c.otherBrand.name}’s video is ready (hidden until the start).`)}</p>
              )}
              {status === "pending" ? (
                <p className="mt-1 text-xs text-zinc-500">{timeLeftLabel(c.expiresAt, t)} {t("zum Antworten", "to reply")}</p>
              ) : (
                <div className="mt-1">
                  <StatusBadge status={status} battleId={c.battleId} />
                </div>
              )}
            </div>
            {status === "pending" && <RespondButtons challengeId={c.id} />}
          </li>
        );
      })}
    </ul>
  );
}

export async function OutgoingChallengeList({ challenges }: { challenges: ChallengeWithBrand[] }) {
  const t = await getT();
  if (challenges.length === 0) {
    return <p className="text-sm text-zinc-500">{t("Noch keine Einladungen gesendet.", "No invites sent yet.")}</p>;
  }
  return (
    <ul className="space-y-3">
      {challenges.map((c) => {
        const status = effectiveStatus(c);
        return (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3">
            <div>
              <BrandChip brand={c.otherBrand} />
              {c.category ? <p className="mt-1 text-xs text-zinc-400">{duelCategoryLabel(c.category, langOf(t))}</p> : null}
            </div>
            <div className="text-right">
              <StatusBadge status={status} battleId={c.battleId} />
              {status === "pending" && <p className="mt-1 text-xs text-zinc-500">{timeLeftLabel(c.expiresAt, t)}</p>}
            </div>
            {status === "pending" && <CancelChallengeButton challengeId={c.id} />}
          </li>
        );
      })}
    </ul>
  );
}
