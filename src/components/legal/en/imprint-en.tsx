import Link from "next/link";
import { TranslationNote } from "@/components/legal/en/legal-parts";

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{children}</h2>
);

// Luca 12.11.: englische Fassung von /impressum — Übersetzung der deutschen Seite.
export function ImprintEn() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-4 text-2xl font-bold text-white">Legal notice</h1>
      <TranslationNote germanHref="/impressum?lang=de" />

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Information pursuant to § 5 ECG</H>
        <p>Austrana Solutions KG</p>
        <p>Edi-Finger-Straße 7/6/602</p>
        <p>1210 Vienna</p>
        <p>Austria</p>
        <p>Company register number: FN 673234 a</p>
        <p>Company register court: Commercial Court of Vienna (Handelsgericht Wien)</p>
        <p>VAT ID: ATU83457527</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Contact</H>
        <p>Email: office@markitch.com · Support: support@markitch.com</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Company</H>
        <p>Legal form: limited partnership (Kommanditgesellschaft, KG), registered office: Vienna</p>
        <p>Authorized representative: Luca Lenz (general partner with unlimited liability)</p>
        <p>Business purpose: services in automatic data processing and information technology</p>
        <p>Trade: services in automatic data processing and information technology (free trade)</p>
        <p>Trade authority: Magistrat der Stadt Wien</p>
        <p>
          Chamber: Vienna Chamber of Commerce (Wirtschaftskammer Wien), professional group for management consulting,
          accounting and information technology (UBIT)
        </p>
        <p>
          Professional regulations: Gewerbeordnung 1994 (Austrian Trade Regulation Act), available at{" "}
          <a href="https://www.ris.bka.gv.at" className="text-orange-400 hover:underline" rel="noopener noreferrer">
            www.ris.bka.gv.at
          </a>
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Disclosure pursuant to § 25 MedienG</H>
        <p>Media owner: Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Vienna</p>
        <p>
          Basic orientation: a platform where businesses and creators show short videos and compete in duels that the
          audience votes on. The videos come from the respective users.
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Dispute resolution</H>
        <p>
          We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer
          arbitration board. We’re happy to sort out any concerns directly: support@markitch.com
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <H>Point of contact under the Digital Services Act</H>
        <p>For authorities and users (Art. 11, 12 DSA): support@markitch.com — German or English.</p>
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        See also{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/nutzungsbedingungen" className="text-orange-400 hover:underline">
          Terms of Use
        </Link>
        .
      </p>
    </div>
  );
}
