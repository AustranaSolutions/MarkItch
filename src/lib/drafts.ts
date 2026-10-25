import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { postDrafts, type PostDraft } from "@/db/schema";
import { isOwnVideoUrl } from "@/lib/storage";

// Luca 25.10.: Entwürfe für Solo-Pitches — auf dem Server, damit App und Web
// dieselben sehen. Gespeichert wird alles außer der Musikrechte-Bestätigung
// (die gehört bewusst zum Posten selbst).

const MAX_DRAFTS = 20;

export type DraftInput = {
  id?: unknown;
  videoUrl?: unknown;
  description?: unknown;
  ctaLabel?: unknown;
  ctaUrl?: unknown;
  containsAiContent?: unknown;
  paidPartnership?: unknown;
};

export type DraftView = {
  id: string;
  videoUrl: string | null;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  containsAiContent: boolean;
  paidPartnership: boolean;
  updatedAt: string;
};

function toView(d: PostDraft): DraftView {
  return {
    id: d.id,
    videoUrl: d.videoUrl,
    description: d.description ?? "",
    ctaLabel: d.ctaLabel ?? "",
    ctaUrl: d.ctaUrl ?? "",
    containsAiContent: d.containsAiContent,
    paidPartnership: d.paidPartnership,
    updatedAt: d.updatedAt.toISOString(),
  };
}

const text = (raw: unknown, max: number): string | null => {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t ? t.slice(0, max) : null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listDrafts(userId: string): Promise<DraftView[]> {
  const rows = await db.select().from(postDrafts).where(eq(postDrafts.userId, userId)).orderBy(desc(postDrafts.updatedAt)).limit(MAX_DRAFTS);
  return rows.map(toView);
}

export async function saveDraft(userId: string, input: DraftInput): Promise<{ ok: true; draft: DraftView } | { ok: false; error: string }> {
  const videoUrl = text(input.videoUrl, 1000);
  if (videoUrl && !isOwnVideoUrl(videoUrl, "solo-pitch-videos", userId)) return { ok: false, error: "Das ist nicht dein Video." };
  const values = {
    videoUrl,
    description: text(input.description, 500),
    ctaLabel: text(input.ctaLabel, 60),
    ctaUrl: text(input.ctaUrl, 500),
    containsAiContent: input.containsAiContent === true,
    paidPartnership: input.paidPartnership === true,
    updatedAt: new Date(),
  };
  if (!values.videoUrl && !values.description && !values.ctaLabel && !values.ctaUrl) {
    return { ok: false, error: "Ein leerer Entwurf wird nicht gespeichert." };
  }

  if (typeof input.id === "string" && UUID_RE.test(input.id)) {
    const [row] = await db
      .update(postDrafts)
      .set(values)
      .where(and(eq(postDrafts.id, input.id), eq(postDrafts.userId, userId)))
      .returning();
    if (row) return { ok: true, draft: toView(row) };
  }

  const [{ n }] = await db.select({ n: count() }).from(postDrafts).where(eq(postDrafts.userId, userId));
  if (n >= MAX_DRAFTS) return { ok: false, error: `Höchstens ${MAX_DRAFTS} Entwürfe — lösch zuerst einen alten.` };
  const [row] = await db.insert(postDrafts).values({ userId, ...values }).returning();
  return { ok: true, draft: toView(row) };
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await db.delete(postDrafts).where(and(eq(postDrafts.id, id), eq(postDrafts.userId, userId)));
}
