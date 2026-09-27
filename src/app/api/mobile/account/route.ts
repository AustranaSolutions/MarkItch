import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { isAdminEmail } from "@/lib/moderation";
import { deleteAccountForUser, updateProfileForUser } from "@/lib/account";
import { fieldErrorResponse, readJsonBody, unauthorized } from "@/lib/mobile-auth";

/** RN-4: Daten für die Einstellungen-Seite der App (Gegenstück zu /profile/settings). */
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const [user] = await db.select().from(users).where(eq(users.id, viewer.id)).limit(1);
  if (!user) return unauthorized();
  const brand = await getBrandForUser(user.id);
  return NextResponse.json({
    account: {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      accountType: user.accountType,
      isVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt.toISOString(),
      isAdmin: isAdminEmail(user.email),
    },
    brand: brand
      ? {
          slug: brand.slug,
          name: brand.name,
          description: brand.description,
          category: brand.category,
          country: brand.country,
          website: brand.website,
          logoUrl: brand.logoUrl,
        }
      : null,
  });
}

/** Name/E-Mail/Profilbild ändern — multipart/form-data (Profilbild als Datei, max. 2 MB). */
export async function PATCH(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const avatar = form.get("avatar");
  const result = await updateProfileForUser(viewer.id, {
    name: form.get("name"),
    email: form.get("email"),
    avatar: avatar instanceof File ? avatar : null,
  });
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ ok: true, emailChanged: result.emailChanged });
}

/** Account löschen (App-Store-Pflicht), mit Passwort bestätigt. */
export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const result = await deleteAccountForUser(viewer.id, { password: body.password });
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ ok: true });
}
