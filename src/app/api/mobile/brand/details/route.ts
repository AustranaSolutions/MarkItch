import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { fieldErrorResponse, unauthorized } from "@/lib/mobile-auth";
import { parseBrandDetails } from "@/lib/brand-details";
import { readVideoUrlField, uploadImage } from "@/lib/storage";
import { photoError } from "@/lib/video-thumbnails";

/**
 * Luca 24.10.: neues Profil — Banner, Vorstellungsvideo, „Button im Profil“,
 * Standort und Info-Blatt. PATCH multipart; nur mitgeschickte Felder ändern
 * sich (die Einstellungsseiten schicken jeweils nur ihren Teil).
 *   banner (Datei) / removeBanner=1
 *   introVideoUrl (eigener Upload, Ordner „videos“) / removeIntro=1
 *   profileButtonType, profileButtonUrl, locationType, locationLabel, address,
 *   phone, contactEmail, openingHours, imprint
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return fieldErrorResponse({ _form: ["Du hast noch kein Profil angelegt."] });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

  const parsed = parseBrandDetails((key) => {
    const value = form.get(key);
    return value === null ? undefined : value;
  });
  if ("errors" in parsed) return fieldErrorResponse(parsed.errors);
  const update: Partial<typeof brands.$inferInsert> = { ...parsed.values, updatedAt: new Date() };

  const banner = form.get("banner");
  if (banner instanceof File && banner.size > 0) {
    const invalid = photoError(banner, "Banner");
    if (invalid) return fieldErrorResponse({ banner: [invalid] });
    update.bannerUrl = (await uploadImage(banner, "banners")).url;
  } else if (form.get("removeBanner") === "1") {
    update.bannerUrl = null;
  }

  if (form.get("introVideoUrl") !== null) {
    const video = await readVideoUrlField(form, "videos", viewer.id, "introVideoUrl");
    if ("error" in video) return fieldErrorResponse({ introVideoUrl: [video.error] });
    update.videoUrl = video.videoUrl;
    update.videoUploadedAt = new Date();
  } else if (form.get("removeIntro") === "1") {
    update.videoUrl = null;
    update.videoUploadedAt = null;
  }

  await db.update(brands).set(update).where(eq(brands.id, brand.id));
  return NextResponse.json({ ok: true });
}
