import Link from "next/link";
import { B, Section, TranslationNote } from "@/components/legal/en/legal-parts";

// Luca 12.11.: englische Fassung von /nutzungsbedingungen — Übersetzung der
// deutschen Seite (Stand 18.10.2026). Bei Änderungen an der deutschen
// Fassung hier mitziehen. Entwurf, vor dem öffentlichen Start anwaltlich prüfen lassen.
export function TermsEn() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Terms of Use</h1>
      <p className="mb-4 text-xs text-zinc-600">As of October 18, 2026 · applies to the MarkItch app and www.markitch.com</p>
      <TranslationNote germanHref="/nutzungsbedingungen?lang=de" />

      <Section title="1. Who we are, what this covers">
        <p>
          MarkItch is a short-video platform where businesses and creators present themselves and compete in duels that
          the audience votes on. It is operated by Austrana Solutions KG (see{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Legal notice
          </Link>
          ). These terms apply to the app and the website. By signing up you agree to them. How we handle your data is
          described in the{" "}
          <Link href="/datenschutz" className="text-orange-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Use is free of charge. Should we ever offer paid features (e.g. reach for videos), separate terms will apply,
          which you will agree to separately beforehand.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You must be at least 16 years old. There are three account types: <B>viewer</B> (watch, vote, like, comment,
          follow, react with your own videos), <B>business/brand</B> and <B>creator</B> (additionally post your own videos
          and compete in duels).
        </p>
        <p>
          One account per person. A business or creator profile can have several team members, each with their own
          account. Keep your details up to date and your password secret. You can delete your account yourself at any
          time in the settings; if you are the last member of a profile, it is deleted with all its content.
        </p>
      </Section>

      <Section title="3. For businesses and creators">
        <p>
          <B>Authorization:</B> You only create a profile for a business, a brand or yourself that you are entitled to
          represent, and you don’t use other people’s names, trademarks or logos. We may review profiles, give them a
          verified badge, and correct or remove them if the information is false.
        </p>
        <p>
          <B>Advertising is recognizable:</B> Videos from businesses are advertising and are automatically labeled as
          “Ad”. Creators must select “Paid partnership / advertising” when posting if they are paid for a video, receive
          something for free or promote their own product; the video is then also labeled as “Ad” (§ 26 MedienG, UWG).
          Covert advertising is prohibited.
        </p>
        <p>
          <B>Fair duels:</B> A duel is comparative advertising (§ 2a UWG). Disparaging, misleading or untrue statements
          about other participants or their products are prohibited. You are responsible for the lawfulness of your
          advertising.
        </p>
        <p>
          <B>Prohibited products:</B> no advertising for tobacco products, e-cigarettes, prescription drugs, weapons,
          gambling or any other legally prohibited products and services. Advertising for alcohol only within the legal
          restrictions and never aimed at minors.
        </p>
        <p>
          <B>Prizes and giveaways:</B> If a business or creator promises prizes, discounts or winnings, they alone are
          the organizer and responsible for the terms of participation and fulfillment. Neither MarkItch nor Apple is an
          organizer or sponsor.
        </p>
        <p>
          <B>Link below the video:</B> The link must match the video and must not lead to unlawful, misleading or harmful
          pages.
        </p>
      </Section>

      <Section title="4. Your content">
        <p>
          You keep all rights to your videos, images and texts. You only upload what you hold the necessary rights to: no
          third-party footage, trademarks or music without permission, and all recognizable people have agreed.
          Substantially AI-generated or manipulated content must be labeled when uploading.
        </p>
        <p>
          You grant us a simple, free, worldwide right to store your content for operating MarkItch, to process it
          technically (e.g. downsize it, generate preview images), to display it publicly and to show it together with
          other content (duels, reactions, previews when sharing, story images). The right ends when you delete the
          content or your account; links already shared by others will then no longer show the content. We only show
          your content in our own advertising with your express consent.
        </p>
        <p>
          If third parties make claims against us because your content infringes their rights, you indemnify us and hold
          us harmless to the extent you are responsible for the infringement.
        </p>
      </Section>

      <Section title="5. What isn’t allowed">
        <p>
          Insulting, discriminatory, threatening, violence-glorifying, sexually explicit or otherwise unlawful content;
          harassment and hate; spam; fake accounts; circumventing suspensions; automated access without our permission.
          Zero tolerance applies here.
        </p>
      </Section>

      <Section title="6. Reporting, moderation, suspensions">
        <p>
          <B>Reporting:</B> Every video, reaction and profile can be reported via “…”, comments by long-pressing; also by
          email to support@markitch.com. You can block accounts that bother you.
        </p>
        <p>
          <B>Automatic measures:</B> Comments are automatically checked for prohibited words, links and spam when
          submitted. If at least three different accounts report a video, it is hidden until reviewed. Removals and
          suspensions are decided by a human.
        </p>
        <p>
          <B>Review:</B> We review reports promptly, usually within 24 hours on business days, taking into account
          freedom of expression and the interests of everyone involved.
        </p>
        <p>
          <B>Consequences:</B> depending on severity, removal of the content, a warning, a temporary or permanent
          suspension; for repeated, obviously unfounded reports also a suspension of the reporting account. We tell you
          what we removed or suspended and why (Art. 17 DSA). You can object by email to support@markitch.com; we will
          then review the decision again. Legal remedies also remain open to you.
        </p>
      </Section>

      <Section title="7. Voting and duels">
        <p>
          Voting is blind: before the deadline nobody sees who is ahead. The official result is the standing at the
          deadline and doesn’t change afterwards; votes cast later only appear as the “current standing”. How you vote
          is private.
        </p>
        <p>
          Duels are for entertainment. They are not gambling, and a win does not create any claim to money, prizes or a
          collaboration, unless a business expressly promises this in an individual case (see section 3). Manipulation
          is prohibited (fake accounts, bought or automated votes, coordinated voting). We may remove suspicious votes
          without notice.
        </p>
      </Section>

      <Section title="8. Availability and liability">
        <p>
          We strive for uninterrupted operation, but we don’t guarantee constant availability. We are only liable for
          other users’ content once we know of an infringement and don’t act without delay.
        </p>
        <p>
          We are liable without limitation for intent and gross negligence and for personal injury. In cases of slight
          negligence we are not liable to businesses; to consumers only for breach of essential obligations and limited
          to the typically foreseeable damage. Mandatory statutory claims remain unaffected.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You can delete your account at any time. We can end the user relationship with 30 days’ notice, and
          immediately in the event of serious violations of these terms.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We announce material changes to these terms at least 30 days in advance in the app and by email. They only
          apply to you once you accept them in the app or on the website. If you don’t agree, you can delete your account
          at any time.
        </p>
      </Section>

      <Section title="11. Apple App Store">
        <p>
          If you download the app from the App Store, Apple’s Standard End User License Agreement also applies. These
          terms are only between you and us: Apple is not a party to the contract, is not responsible for the app, its
          content or support, and has no warranty obligations. Apple and its subsidiaries are third-party beneficiaries
          of these terms and can enforce them against you.
        </p>
      </Section>

      <Section title="12. Governing law and jurisdiction">
        <p>
          Austrian law applies, excluding its conflict-of-law rules and the UN Convention on Contracts for the
          International Sale of Goods. If you are a consumer, the mandatory protective provisions of your country of
          residence remain unaffected, and you can sue and be sued at your place of residence. For businesses, the place
          of jurisdiction is Vienna.
        </p>
        <p>
          The contract language is German; this translation is for information only. If a provision is invalid, the rest
          remains valid.
        </p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        See also{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Legal notice
        </Link>{" "}
        and{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
