"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Alte Benachrichtigungen zeigen auf /profile/settings#einladungen → weiter zur eigenen Seite. */
export function InvitesHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#einladungen") router.replace("/profile/settings/invites");
  }, [router]);
  return null;
}
