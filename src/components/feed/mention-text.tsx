import Link from "next/link";
import { Fragment } from "react";

// Luca 15.11.: Beschreibung mit markierten Profilen („@genussfux“) — nur echte
// Profile (vom Server aufgelöst) werden zum Link aufs Profil.
const TOKEN_RE = /(@[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?)/gi;

export function MentionText({ text, mentions }: { text: string; mentions: { slug: string; name: string }[] }) {
  const known = new Set(mentions.map((m) => m.slug));
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        const slug = part.startsWith("@") ? part.slice(1).toLowerCase() : null;
        if (slug && known.has(slug)) {
          return (
            <Link key={i} href={`/brands/${slug}`} className="pointer-events-auto font-semibold text-orange-400 hover:underline">
              {part}
            </Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
