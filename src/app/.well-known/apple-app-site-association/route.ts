import { NextResponse } from "next/server";

// Luca 17.10.: Universal Links — sagt iOS, dass die MarkItch-App
// (Team Austrana Solutions KG, Kennung com.austranasolutions.markitch) geteilte
// www.markitch.com-Links direkt öffnen darf. Ohne installierte App öffnet
// sich wie bisher die Website. Mails (Passwort zurücksetzen, E-Mail
// bestätigen), Admin und API bleiben bewusst auf der Website.
const APP_ID = "CZ28DX9F82.com.austranasolutions.markitch";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    applinks: {
      details: [
        {
          appIDs: [APP_ID],
          components: [
            { "/": "/api/*", exclude: true },
            { "/": "/admin*", exclude: true },
            { "/": "/reset-password*", exclude: true },
            { "/": "/verify-email*", exclude: true },
            { "/": "/forgot-password*", exclude: true },
            { "/": "/datenschutz*", exclude: true },
            { "/": "/impressum*", exclude: true },
            { "/": "/nutzungsbedingungen*", exclude: true },
            { "/": "/battles/*" },
            { "/": "/pitches/*" },
            { "/": "/brands/*" },
            { "/": "/castings/*" },
            { "/": "/challenges/*" },
            { "/": "/", "?": { pitch: "?*" } },
            { "/": "/", "?": { battle: "?*" } },
          ],
        },
      ],
    },
  });
}
