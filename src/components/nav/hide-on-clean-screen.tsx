"use client";

import type { ReactNode } from "react";
import { useCleanScreen } from "@/lib/clean-screen";

/** Luca 13.11.: blendet z. B. die Glocke aus, solange im Feed „Bildschirm frei“ aktiv ist. */
export function HideOnCleanScreen({ children }: { children: ReactNode }) {
  return useCleanScreen() ? null : <>{children}</>;
}
