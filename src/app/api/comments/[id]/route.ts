import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteCommentFor } from "@/lib/comment";

type Params = { params: Promise<{ id: string }> };

// Phase F: eigenen Kommentar oder einen unter dem eigenen Video löschen (App).
export async function DELETE(_request: NextRequest, { params }: Params) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const { id } = await params;
  const result = await deleteCommentFor(viewer.id, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
