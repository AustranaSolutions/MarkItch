import { NextResponse } from "next/server";
import { requireMobileAdmin } from "@/lib/mobile-admin";
import { listUsersForAdmin } from "@/lib/admin-users";

// Luca 20.11.: Nutzerliste (Admin) — Marken, Creator, Zuschauer, ohne Profil.
export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  return NextResponse.json(await listUsersForAdmin());
}
