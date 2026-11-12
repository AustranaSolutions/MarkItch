import Link from "next/link";
import { ConsentSettings } from "@/components/analytics/consent-banner";
import { B, Section, TranslationNote } from "@/components/legal/en/legal-parts";

// Luca 12.11.: englische Fassung von /datenschutz — Übersetzung der deutschen
// Seite (Stand 18.10.2026). Bei Änderungen an der deutschen Fassung hier
// mitziehen. Entwurf, vor dem öffentlichen Start anwaltlich prüfen lassen.
export function PrivacyEn() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Privacy Policy</h1>
      <p className="mb-4 text-xs text-zinc-600">As of October 18, 2026 · applies to the MarkItch app and www.markitch.com</p>
      <TranslationNote germanHref="/datenschutz?lang=de" />

      <Section title="Controller">
        <p>
          Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Vienna, Austria (see{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Legal notice
          </Link>
          ). For all privacy matters: <B>support@markitch.com</B>. We are not required to appoint a data protection
          officer.
        </p>
      </Section>

      <Section title="In short">
        <p>
          We only process what MarkItch needs to work. No ad networks, no selling of data, no tracking across other apps
          or websites. Videos, business and creator profiles, comments and reactions are public. Nobody but you can see
          how you vote.
        </p>
      </Section>

      <Section title="1. Account">
        <p>
          <B>Data:</B> Your email address and password (stored only as a hash, never in plain text) are required for
          the account. Optional: display name and profile picture. Also your account type (viewer, business/brand or
          creator), whether your email is confirmed and when you accepted the Terms of Use.
        </p>
        <p>
          <B>Business and creator profiles</B> (name, logo or profile picture, description, category, country,
          website/link) are public.
        </p>
        <p>
          <B>Purpose and legal basis:</B> Providing your account and MarkItch (contract, Art. 6(1)(b) GDPR).
          Confirmation links are valid for 24 hours, password reset links for 1 hour. In the app, your login key is
          stored only in encrypted form on your device.
        </p>
      </Section>

      <Section title="2. What others see about you">
        <p>
          Public: your display name (without a name it says “User”, never part of your email address), your profile
          picture, your comments, your reaction videos, and who you follow and who follows you. Your email address is
          never public.
        </p>
        <p>
          <B>Voting stays private:</B> We store how you voted in a duel so you can only vote once, get told the result
          and see “Your taste” on your profile. Other users and the businesses only see totals, never who voted how.
          “Your taste” is only visible to you and has no consequences.
        </p>
      </Section>

      <Section title="3. Content and interactions">
        <p>
          Videos you upload (with description, link and the information on music rights, AI content and paid
          partnership), comments, likes, votes, reactions, who you follow, who you block, what you report and your
          notifications. Videos are downsized on your device when uploading; we generate preview images from them.
        </p>
        <p>
          <B>Camera, microphone, photos (app):</B> only when you record or select something yourself, and only after you
          allow it in the iOS settings.
        </p>
        <p>Legal basis: contract (Art. 6(1)(b) GDPR).</p>
      </Section>

      <Section title="4. Moderation and safety">
        <p>
          <B>Automatic checks:</B> Comments are automatically checked for prohibited words, links and repeated content
          when submitted; rejected comments are neither published nor stored. If at least three different accounts that
          are at least 7 days old report a video, it is automatically hidden until reviewed. Removals and suspensions
          are always decided by a human.
        </p>
        <p>
          <B>Abuse prevention:</B> To fend off fake accounts and manipulated votes, we briefly store the IP address or an
          account identifier when you sign up, log in and vote (rate limiting).
        </p>
        <p>
          Legal basis: legal obligations under the Digital Services Act (Art. 6(1)(c) GDPR) and our legitimate interest
          in a safe, fair platform (Art. 6(1)(f) GDPR).
        </p>
      </Section>

      <Section title="5. Notifications">
        <p>
          We only send push notifications (e.g. the result of a duel, a new invite) if you allow them. For this we store
          the push token of your device or browser. You can withdraw at any time in the iOS settings or in your browser.
          Legal basis: your consent (Art. 6(1)(a) GDPR). System emails (confirmation, password reset) are part of the
          contract.
        </p>
      </Section>

      <Section title="6. Usage statistics">
        <p>
          We count how often videos are watched, shared or clicked and through which shared link someone arrived. For
          this we use a random identifier that is not linked to your account:
        </p>
        <p>
          <B>In the app</B> it only exists while the app is open; nothing is stored on your device.
        </p>
        <p>
          <B>On the web</B> only for the current page view, unless you allow statistics in the banner. Then we set a
          cookie (lifetime at most 400 days) that also lets us count returning visits.
          <ConsentSettings />
        </p>
        <p>
          Businesses and creators only see aggregated figures for their own videos, never who watched something. Legal
          basis: legitimate interest in improving MarkItch and in statistics for businesses (Art. 6(1)(f) GDPR); for the
          web cookie your consent (§ 165(3) TKG 2021, Art. 6(1)(a) GDPR), which you can withdraw at any time.
        </p>
        <p>
          <B>Error logs:</B> If a technical error occurs, our host briefly stores the page visited, the error message
          and the browser type so we can fix the error (legitimate interest).
        </p>
      </Section>

      <Section title="7. Sharing on Instagram">
        <p>
          When you share a video as an Instagram story, the app passes the story image and the link to the Instagram app
          of Meta Platforms Ireland Ltd. This only happens when you trigger it; from then on Meta’s privacy policy
          applies. The app identifier used for this only identifies MarkItch, not you.
        </p>
      </Section>

      <Section title="8. Recipients (processors)">
        <p>
          <B>Vercel Inc.</B> (USA) — hosting; the application runs in Frankfurt.
        </p>
        <p>
          <B>Supabase Inc.</B> (USA) — database and storage of videos and images, data center in Frankfurt.
        </p>
        <p>
          <B>Resend Inc.</B> (USA) — sending system emails (sent via Ireland).
        </p>
        <p>
          <B>650 Industries Inc. (“Expo”, USA) and Apple Push Notification Service</B> — delivering push notifications in
          the app; on the web, your browser’s push service.
        </p>
        <p>
          We have data processing agreements under Art. 28 GDPR with our processors where offered. Transfers to the USA
          are based on the EU-US Data Privacy Framework or EU standard contractual clauses (Art. 45, 46 GDPR).
        </p>
      </Section>

      <Section title="9. Retention">
        <p>
          <B>Account and content:</B> until you delete them or your account (at any time yourself in the settings).
          Deleting your account deletes videos, comments, likes, votes, reactions, notifications and push tokens; if you
          are the last member of a business or creator profile, that profile is deleted too, with all its content.
          Files no longer in use are removed automatically after 48 hours. Backups of our database provider are
          overwritten according to its schedules.
        </p>
        <p>
          <B>Abuse prevention (IP addresses):</B> at most 7 days, then deleted automatically.
        </p>
        <p>
          <B>Raw statistics data:</B> 13 months, then deleted automatically.
        </p>
        <p>
          <B>Push token:</B> until you log out, turn off notifications or the token becomes invalid.
        </p>
        <p>
          <B>Reports and moderation decisions:</B> until resolved, then at most 3 years (evidence for authorities and in
          disputes).
        </p>
      </Section>

      <Section title="10. Your rights">
        <p>
          You have the right to access, rectification, erasure, restriction of processing, data portability and to
          object to processing based on legitimate interest (Art. 15–21 GDPR). You can withdraw consent at any time with
          effect for the future. Write to us at support@markitch.com. You can also complain to the Austrian Data
          Protection Authority (Barichgasse 40–42, 1030 Vienna, dsb.gv.at).
        </p>
      </Section>

      <Section title="11. Age">
        <p>MarkItch is for ages 16 and up. If we learn that an account belongs to someone younger, we delete it.</p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        See also{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Legal notice
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
