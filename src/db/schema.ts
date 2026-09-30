import { pgTable, uuid, text, timestamp, uniqueIndex, index, integer, boolean, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Phase 1: just what real authentication needs.
// More tables (Brand, Battle, Vote, ...) get added in later phases.

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    // Phase 8: 'acro' (a brand — posts videos, invites, replies) or
    // 'assent' (watches and votes, can never own a brand). Chosen once at
    // registration, not changeable from the UI yet. Existing rows get
    // backfilled by the migration: anyone already in brand_members becomes
    // 'acro', everyone else 'assent' — see drizzle/ for the backfill UPDATE.
    accountType: text("account_type").notNull().default("assent"),
    // Phase 48: persönliches Profilbild — vorher gab es dafür überhaupt
    // keine Spalte, ein Assent-Account (kein eigenes Markenprofil) zeigte
    // nur einen generierten Buchstaben-Platzhalter ohne jede Möglichkeit,
    // ihn zu ersetzen (Luca: "man kann sein Profilbild garnicht ändern").
    // Getrennt von brands.logoUrl — das bleibt das Markenlogo.
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Phase 24: moderation. Set by an admin via /admin/moderation — checked
    // at login (auth.ts) and on every requireUser()/getOptionalUser() call
    // (session.ts), so a ban actually cuts an already-active session off,
    // not just future logins.
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
);

// Single-use token for confirming an email address.
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // We store a SHA-256 hash of the token, never the raw value.
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single-use token for resetting a forgotten password.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Phase 2: brands. Kept intentionally small — one owner per brand for now.
// brandMembers exists as its own table (rather than an ownerId column on
// brands) so that adding teams/roles later is additive, not a migration.

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    website: text("website"),
    category: text("category").notNull(),
    country: text("country").notNull(),
    // Phase 46: Branchen-Compliance-Attestierung (Rechtskonformitäts-Audit,
    // Phase 45) — Österreich verbietet/beschränkt Werbung für bestimmte
    // Produkte strikt (Tabak, E-Zigaretten, Rx-Medikamente). Ein
    // automatischer Inhalts-Scan ist unrealistisch; die rechtlich tragfähige
    // Umsetzung ist eine AGB-Bestätigung beim Erstellen, wie die PDF selbst
    // für Musikrechte vorschlägt ("Rechtliche Freistellung (AGB)"). Nullable,
    // weil vor dieser Migration erstellte Marken das nie bestätigt haben —
    // absichtlich nicht rückwirkend gesetzt.
    industryComplianceConfirmedAt: timestamp("industry_compliance_confirmed_at", { withTimezone: true }),
    // Phase 3: one showcase video per brand for now. A brand's actual
    // battle submissions get their own table once Phase 4/5 need it — this
    // column is just "the video on my public profile".
    videoUrl: text("video_url"),
    videoUploadedAt: timestamp("video_uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brands_slug_unique_idx").on(table.slug)],
);

export const brandMembers = pgTable(
  "brand_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brand_members_brand_user_unique_idx").on(table.brandId, table.userId)],
);

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;

// Phase 4: challenges. Brand A challenges Brand B; Brand B has a window to
// accept or decline (see CHALLENGE_WINDOW_MS in src/lib/challenge.ts — 2
// weeks by default, long enough to actually produce a video). Expiry is
// computed at read time (effectiveStatus() in src/lib/challenge.ts) rather
// than via a cron job — simpler, and correct regardless of how long it's
// been since anyone looked.
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengerBrandId: uuid("challenger_brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    challengedBrandId: uuid("challenged_brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    // Phase 13: set when this challenge was sent via "Pitch schicken" on a
    // solo pitch rather than from a brand profile — challengedBrandId is
    // always that solo pitch's own brand. Read only at acceptance time (see
    // respondToChallenge): the challenged brand already has a video (the
    // solo pitch itself), so only the challenger needs to produce one.
    soloPitchId: uuid("solo_pitch_id").references(() => soloPitches.id, { onDelete: "cascade" }),
    // Phase 44: which duel format this invite is for (see DUEL_CATEGORIES
    // in src/lib/battle-format.ts) — chosen by the challenger when sending
    // the invite, so the challenged brand can see it before deciding, then
    // carried over verbatim to the resulting battle's own category column
    // on acceptance. Same hand-copied-default reasoning as battles.category
    // below — schema.ts avoids importing from battle-format.ts.
    category: text("category").notNull().default("Verkaufe dein Produkt oder deine Leistung in 15 Sekunden"),
    // 'pending' | 'accepted' | 'declined' — expiry is derived, not stored,
    // except we flip a pending row to 'expired' the next time it's touched
    // (respondToChallenge) so a stale row doesn't look actionable forever.
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("challenges_challenger_challenged_pending_idx")
      .on(table.challengerBrandId, table.challengedBrandId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

// Phase 5/7: battles. Two ways a battle gets created (see
// src/lib/battle-format.ts for the shared constants and
// src/lib/battle-stage.ts for how the fields below combine into a single
// computed "stage"):
//
// 1. 'scheduled' — a challenge gets accepted (src/app/actions/challenge.ts).
//    challengeId is set, both video columns start empty, productionDeadline
//    is 2 weeks out. Nothing is visible/votable until BOTH brands upload
//    their own video for THIS battle — that's what "verdeckt" means: nobody
//    can see (or copy) the other side's video before posting their own.
// 2. 'open' — a brand's already-public showcase video (brands.videoUrl)
//    gets countered by another brand, no permission needed (Phase 7 —
//    src/app/actions/battle.ts, counterWithVideo). challengeId is null,
//    both video columns are filled at creation (the original video is
//    copied in, not live-referenced, so it can't shift under an ongoing
//    battle), productionDeadline is null since there's nothing to wait for.
//
// Either way, the moment both video columns are filled, votingEndsAt gets
// set (now + VOTING_WINDOW_MS) — that's the actual "battle is live, vote
// now" moment, and it's what the follower notification fires on (see
// activateBattleIfBothSidesReady in src/lib/battle-stage.ts), not challenge
// acceptance or the open-mode counter itself.
//
// status/winner/resolution are NOT stored — src/lib/battle-stage.ts derives
// "awaiting_videos" / "voting" / "finished" (+ winner, +
// walkover-vs-voted-vs-no-show) from these timestamps at read time, same
// philosophy as challenges' effectiveStatus(). The old `status` column
// stays for backward compatibility but is otherwise unused.
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
    brandAId: uuid("brand_a_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    brandBId: uuid("brand_b_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    // 'scheduled' | 'open'
    mode: text("mode").notNull().default("scheduled"),
    // Phase 44: was free text with a single platform-wide value; now set
    // from the challenger's actual pick (see DUEL_CATEGORIES in
    // src/lib/battle-format.ts and challenges.category above) at acceptance
    // time. The column-level default (kept in sync by hand, since schema.ts
    // can't import from a module that itself has no DB dependency without
    // risking a circular import) exists only so old rows aren't left null —
    // every actual insert always passes it explicitly.
    category: text("category").notNull().default("Verkaufe dein Produkt oder deine Leistung in 15 Sekunden"),
    brandAVideoUrl: text("brand_a_video_url"),
    brandBVideoUrl: text("brand_b_video_url"),
    // Phase 27: Call-to-Action. "A video that can't be acted on doesn't sell
    // anything" — every fresh video upload now asks where a viewer should
    // go next (shop, menu, map, a discount-code landing page). Nullable
    // (existing rows never had one) but required at the upload-form level
    // for any new upload — see uploadBattleVideo/counterWithVideo. Per side,
    // not per battle, since brandAVideoUrl/brandBVideoUrl already are; a
    // side with no CTA of its own falls back to that brand's profile
    // `website` at display time (see resolveBattleVideos-adjacent code in
    // feed.ts), never silently to the *other* side's link.
    brandACtaLabel: text("brand_a_cta_label"),
    brandACtaUrl: text("brand_a_cta_url"),
    brandBCtaLabel: text("brand_b_cta_label"),
    brandBCtaUrl: text("brand_b_cta_url"),
    // Phase 46: siehe soloPitches.containsAiContent — per Seite, nicht pro
    // Duell, da jede Seite ihr Video unabhängig hochlädt.
    brandAContainsAiContent: boolean("brand_a_contains_ai_content").notNull().default(false),
    brandBContainsAiContent: boolean("brand_b_contains_ai_content").notNull().default(false),
    brandASubmittedAt: timestamp("brand_a_submitted_at", { withTimezone: true }),
    brandBSubmittedAt: timestamp("brand_b_submitted_at", { withTimezone: true }),
    productionDeadline: timestamp("production_deadline", { withTimezone: true }),
    votingEndsAt: timestamp("voting_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Phase 12: set the first time the "result is in" push notification has
    // been sent to this battle's voters — see finalizeAndNotifyBattle() in
    // src/lib/battle-notify.ts. Doubles as the concurrency guard: the update
    // that sets this column is conditioned on it still being NULL, so if two
    // requests race to finalize the same battle (plausible — this fires from
    // ordinary feed reads, not a cron job), only one actually sends pushes.
    resultNotifiedAt: timestamp("result_notified_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("battles_challenge_id_unique_idx").on(table.challengeId)],
);

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;

// Phase 5.1: follows. A user follows a brand to get notified when that
// brand's next battle kicks off — separate from brand_members, which is
// about who *runs* a brand, not who watches it.
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("follows_user_brand_unique_idx").on(table.userId, table.brandId)],
);

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

// Phase 5.1: notifications. In-app only for now (no push/email infra for
// this yet — see README). Created for every follower of either brand the
// moment a challenge is accepted, so "someone I follow is about to battle"
// doesn't require anyone to keep checking back.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  battleId: uuid("battle_id").references(() => battles.id, { onDelete: "cascade" }),
  // Phase 35: a plain relative URL (e.g. "/?pitch=<id>", "/brands/<slug>") —
  // added so follow/like/comment notifications (which aren't always about a
  // battle) can still deep-link somewhere. `battleId` stays for the older
  // "Pitch live" notifications and their existing fallback link derivation
  // in notification-list.tsx; new notification types just set `link`
  // directly instead of adding yet another nullable target-id column.
  link: text("link"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Phase 6: votes. One vote per user per battle (unique index below is what
// actually enforces that — the app checks first for a friendly error, but
// the constraint is the real backstop). No voting deadline for now: the
// tally is just live and ongoing, "who's ahead right now" rather than a
// closed poll — battles.status stays 'active' until a future phase gives a
// concrete reason to close voting (a season, a fixed window, etc.).
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    votedForBrandId: uuid("voted_for_brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("votes_battle_user_unique_idx").on(table.battleId, table.userId)],
);

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;

// Phase 8: comments. Flat, TikTok/Reels-style list under a Pitch — no
// threading/replies-to-comments yet, and no edit/delete UI (a known rough
// edge, see README). Anyone signed in can comment, including a Pitch's own
// Acros — this is a discussion thread, not a vote, so there's no
// self-comment restriction like there is for votes.
// Phase 13: battleId became nullable and soloPitchId was added so a comment
// can also live under a solo pitch — exactly one of the two is set (same
// app-level-only enforcement as `likes` above). Reactions don't get their
// own comment thread in this phase — they're a video reacting to the pitch,
// discussion stays on the pitch itself.
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  battleId: uuid("battle_id").references(() => battles.id, { onDelete: "cascade" }),
  soloPitchId: uuid("solo_pitch_id").references(() => soloPitches.id, { onDelete: "cascade" }),
  // Phase 40: reactions used to be the one card type with no comment
  // thread at all ("discussion stays on the pitch itself") — Luca:
  // like/comment/teilen/melden should be the same four buttons everywhere,
  // no reason reactions are the odd one out. Exactly one of battleId/
  // soloPitchId/reactionId is ever set, same convention as `likes`.
  reactionId: uuid("reaction_id").references((): AnyPgColumn => reactions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// Phase 9: likes. A generic "like this video" heart, one per user per
// battle-side (battleId + brandId identifies exactly one card in the
// feed — a battle has two sides, each with its own video and its own like
// count). Deliberately separate from `votes`: a like is a free, repeatable-
// per-video reaction like TikTok's heart, a vote is the one-per-battle
// "who wins this Pitch" decision — a viewer can like both sides but can
// only vote for one.
// Phase 13: battleId became nullable and soloPitchId/reactionId were added
// so a like can also target a solo pitch or a reaction — exactly one of the
// three is ever set (enforced in app code, e.g. toggleLikeForUser vs.
// toggleSoloPitchLikeForUser/toggleReactionLikeForUser in src/lib/like.ts;
// no DB-level CHECK constraint, same style as the rest of this file). Kept
// as one table rather than three, since it's still the exact same "one
// heart per user per thing" concept — only what it points at changed.
export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    battleId: uuid("battle_id").references(() => battles.id, { onDelete: "cascade" }),
    // Always required, even for a solo-pitch/reaction like — it's the
    // video's own brand, denormalized so this column can stay NOT NULL
    // instead of widening nullability further.
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    soloPitchId: uuid("solo_pitch_id").references(() => soloPitches.id, { onDelete: "cascade" }),
    reactionId: uuid("reaction_id").references(() => reactions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("likes_battle_brand_user_unique_idx").on(table.battleId, table.brandId, table.userId),
    uniqueIndex("likes_solo_pitch_user_unique_idx")
      .on(table.soloPitchId, table.userId)
      .where(sql`${table.soloPitchId} is not null`),
    uniqueIndex("likes_reaction_user_unique_idx")
      .on(table.reactionId, table.userId)
      .where(sql`${table.reactionId} is not null`),
  ],
);

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

// Phase 10: battle reminders. "Erinnere mich" on an upcoming (not-yet-live)
// Pitch in the reframed /pitches list — deliberately separate from
// `follows`: a reminder is set on one specific matchup, not on a brand, so
// it also works for a Pitch between two brands you don't otherwise follow.
// The moment a battle goes live (activateBattleIfBothSidesReady), everyone
// who set a reminder gets a notification too — see battle-stage.ts.
export const battleReminders = pgTable(
  "battle_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("battle_reminders_battle_user_unique_idx").on(table.battleId, table.userId)],
);

export type BattleReminder = typeof battleReminders.$inferSelect;
export type NewBattleReminder = typeof battleReminders.$inferInsert;

// Phase 12: web push subscriptions. One row per browser/device a user has
// granted notification permission on (a user can have several — phone +
// laptop). `endpoint` is unique per browser subscription and doubles as the
// natural upsert key (re-subscribing the same browser replaces its keys
// rather than duplicating the row). Used today specifically to tell a voter
// the moment their Pitch's result is in — see src/lib/battle-notify.ts — not
// yet a general notification-preferences system.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("push_subscriptions_endpoint_unique_idx").on(table.endpoint)]);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

// RN-7: Blockieren (App-Store-Richtlinie 1.2 für Nutzerinhalte). Immer
// Konto → Konto; „Marke blockieren" legt je eine Zeile pro Mitglied dieser
// Marke an. Wirkt nur für den Blockierenden: dessen Feed, Reaktionen und
// Kommentare blenden die Inhalte der blockierten Konten aus (lib/block.ts).
export const userBlocks = pgTable("user_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerUserId: uuid("blocker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: uuid("blocked_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("user_blocks_pair_unique_idx").on(table.blockerUserId, table.blockedUserId)]);

// RN-6: Push-Kennungen der nativen App (Expo Push Service). Eigene Tabelle
// statt push_subscriptions, weil Web-Push (VAPID: endpoint + Schlüssel) und
// Expo (eine einzige Token-Zeichenkette) völlig verschiedene Daten sind.
// Ein Gerät = ein Token; meldet sich dort jemand anderes an, wandert der
// Token per Upsert zum neuen Nutzer.
export const mobilePushTokens = pgTable("mobile_push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("mobile_push_tokens_token_unique_idx").on(table.token)]);

// Phase 13: solo pitches. A video posted without an opponent — every video
// starts life as one of these, viewable/likable/commentable on its own, no
// battle required. Deliberately its own table rather than a one-sided
// `battles` row: keeps battle-stage.ts's two-sided assumptions (winner,
// walkover, no-show) untouched, since a solo pitch never has a "stage" in
// that sense at all.
export const soloPitches = pgTable("solo_pitches", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  videoUrl: text("video_url").notNull(),
  category: text("category").notNull(),
  // Phase 30: a real caption, like every other short-video app — separate
  // from ctaLabel below (that's a button's text, e.g. "Jetzt bestellen"),
  // this is what the video is actually about. Nullable: existing posts
  // predate this field.
  description: text("description"),
  // Phase 27: Call-to-Action — see the matching comment on battles above.
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  // Phase 46: EU-AI-Act-Kennzeichnungspflicht (Rechtskonformitäts-Audit) —
  // ein Upload-Schalter, kein automatischer Scan. Default false statt
  // nullable, weil "keine Angabe" hier praktisch dasselbe bedeutet wie
  // "nein" — ein Pflichtfeld hätte jeden bestehenden Upload-Flow für ein
  // Rand-Feature verkompliziert.
  containsAiContent: boolean("contains_ai_content").notNull().default(false),
  // RN-7 (Luca 30.09.): Einreichung zu einer Creator-Challenge — der Post
  // läuft ganz normal im Feed (Likes = Rangliste), führt aber per Knopf zur
  // Challenge. Null = normaler Solo-Pitch. Wird die Challenge gelöscht,
  // bleibt der Post als normaler Solo-Pitch stehen.
  creatorChallengeId: uuid("creator_challenge_id").references(() => creatorChallenges.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Eine Einreichung pro Marke und Challenge (Nullwerte zählen nicht → normale Posts unbegrenzt).
  uniqueIndex("solo_pitches_challenge_brand_unique_idx").on(table.creatorChallengeId, table.brandId),
]);

export type SoloPitch = typeof soloPitches.$inferSelect;
export type NewSoloPitch = typeof soloPitches.$inferInsert;

// Phase 13: reactions. Any brand can post one reaction video per solo pitch,
// no permission needed — never on a battle side (only on a solo pitch, see
// CLAUDE-CODE-UEBERGABE.md §6). `promotedToBattleId` is set once the solo
// pitch's own brand "hochstuft" this reaction into an official Duell — kept
// on the reaction rather than inferred, so the UI can show "already a
// Duell" without re-deriving it.
//
// Phase 40: `parentReactionId` — a reaction can reply to another reaction
// instead of only ever to the original solo pitch, so two brands can go
// back and forth ("Coke vs. Pepsi", Luca's own example) instead of every
// reply piling onto the same pitch as a flat, unordered list.
// `soloPitchId` stays set even on a reply (denormalized root) so the whole
// chain still loads/groups under one pitch without walking parent links.
// The old "one reaction per brand per pitch" unique index is replaced by
// two narrower ones: a brand may still only post one *top-level* reaction
// per pitch, but can each reply once per specific reaction it's answering
// — that's what makes an actual back-and-forth chain possible.
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    soloPitchId: uuid("solo_pitch_id")
      .notNull()
      .references(() => soloPitches.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    parentReactionId: uuid("parent_reaction_id").references((): AnyPgColumn => reactions.id, { onDelete: "cascade" }),
    videoUrl: text("video_url").notNull(),
    promotedToBattleId: uuid("promoted_to_battle_id").references(() => battles.id, { onDelete: "set null" }),
    // Phase 46: siehe soloPitches.containsAiContent.
    containsAiContent: boolean("contains_ai_content").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reactions_solo_pitch_brand_top_level_unique_idx")
      .on(table.soloPitchId, table.brandId)
      .where(sql`${table.parentReactionId} is null`),
    uniqueIndex("reactions_parent_reaction_brand_unique_idx")
      .on(table.parentReactionId, table.brandId)
      .where(sql`${table.parentReactionId} is not null`),
  ],
);

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;

// Phase 14: rate limiting. One row per "this happened" event — checkRateLimit
// (src/lib/rate-limit.ts) counts rows for a bucket+identifier within the
// bucket's own time window rather than maintaining a running counter, same
// "recompute from raw rows" philosophy as vote tallies/like counts
// elsewhere. `identifier` is whatever actually identifies the actor for
// that bucket — an IP address for anonymous actions (register, vote), a
// brandId for brand actions (challenge, reaction) — deliberately just text,
// not a foreign key, since what it points at varies by bucket.
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucket: text("bucket").notNull(),
    identifier: text("identifier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rate_limit_hits_bucket_identifier_created_idx").on(table.bucket, table.identifier, table.createdAt)],
);

export type RateLimitHit = typeof rateLimitHits.$inferSelect;
export type NewRateLimitHit = typeof rateLimitHits.$inferInsert;

// Phase 16: brand analytics. One row per view/share event, always
// attributed to the brand whose content it was — deliberately not more
// granular (which exact video, which exact viewer) for now, since the
// dashboard this feeds only needs brand-level and per-content-item totals,
// both computable by counting rows. Same "event log, not a counter"
// philosophy as rate_limit_hits — cheap to extend into a real trend chart
// later (group by day) without a schema change.
export const brandAnalyticsEvents = pgTable(
  "brand_analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'view' | 'share'
    // Phase 41: a view was only ever counted per-brand (for the dashboard's
    // aggregate stat) — Luca wanted a visible per-video count like TikTok/
    // Insta show, which needs to know *which* pitch/battle a view was for,
    // not just which brand. Both nullable and additive: existing brand-level
    // aggregation (getEventCount) is untouched, this just also tags the
    // same event with whichever piece of content it was for, when there is
    // one (a solo pitch's or a battle side's view — never both).
    soloPitchId: uuid("solo_pitch_id").references(() => soloPitches.id, { onDelete: "cascade" }),
    battleId: uuid("battle_id").references(() => battles.id, { onDelete: "cascade" }),
    // Phase 47: anonymes, cookiebasiertes Besucher-Kennzeichen (kein Personenbezug,
    // siehe visitorEvents unten) — zusätzlich zu brandId/kind, damit sich "Videos
    // pro Session"/"3/5/10 Videos angesehen" aus den ohnehin schon laufenden
    // view-Events berechnen lassen, ohne jeden View doppelt zu loggen. Auch für
    // 'cta_click', 'vote_click' und 'login_required' genutzt (siehe analytics.ts).
    anonId: text("anon_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("brand_analytics_events_brand_kind_idx").on(table.brandId, table.kind)],
);

export type BrandAnalyticsEvent = typeof brandAnalyticsEvents.$inferSelect;
export type NewBrandAnalyticsEvent = typeof brandAnalyticsEvents.$inferInsert;

// Phase 47: BETA-2-F/G aus MarkItch_Launch_Minimum_Claude_Code_Prompt.md
// ("Produkt-/Funnel-Analytics", "Vote-Funnel") — brandAnalyticsEvents deckt nur
// content-gebundene Events ab (immer eine brandId nötig); Besuchs-/Konto-Events
// wie "Session begonnen" oder "Registrierung begonnen" gehören zu keiner
// bestimmten Marke, brauchen aber trotzdem einen anonymen Besucher-Bezug für
// Sessions/Besucher-Zählung und D1/D7/D30-Retention. Bewusst eine eigene,
// kleine Tabelle statt brandId nullable zu machen — hält die bestehende
// Invariante von brandAnalyticsEvents unangetastet.
export const visitorEvents = pgTable(
  "visitor_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anonId: text("anon_id").notNull(),
    kind: text("kind").notNull(), // 'session_start' | 'register_started'
    // Nur gesetzt, wenn zum Zeitpunkt des Events ein Account eingeloggt war —
    // erlaubt später z.B. "wie viele Sessions kamen von einem bereits
    // registrierten Nutzer", ohne dass anonId selbst je einen Personenbezug hätte.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // Referral-Code aus ?ref= beim ersten Aufruf dieser Session — von den
    // Share-Buttons gesetzt (z.B. "battle:<id>"), um "Herkunft über geteilte
    // MarkItch-Links" zu messen. Null = organischer/direkter Aufruf.
    ref: text("ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("visitor_events_anon_created_idx").on(table.anonId, table.createdAt),
    index("visitor_events_kind_created_idx").on(table.kind, table.createdAt),
  ],
);

export type VisitorEvent = typeof visitorEvents.$inferSelect;
export type NewVisitorEvent = typeof visitorEvents.$inferInsert;

// Phase 19: Partner-Castings. A brand opens a call for other brands
// (creators/influencers who've set up their own brand profile) to submit a
// pitch video; the community votes on the submissions; whoever has the
// most votes when voting closes becomes the "offizieller Partner". This is
// deliberately its own three-table mini-system rather than reusing
// reactions/likes: a reaction is a free, repeatable-per-brand like (Phase
// 13), this is an exclusive one-vote-per-user choice among N candidates —
// same difference as likes vs. votes on a Duell, just generalized from 2
// sides to N.
//
// Stage ("open for submissions" / "voting" / "finished") is derived from
// the two timestamps at read time — see src/lib/casting.ts's
// getCastingStage — same philosophy as challenges/battles throughout this
// file, not stored.
export const partnerCastings = pgTable("partner_castings", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostBrandId: uuid("host_brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }).notNull(),
  votingEndsAt: timestamp("voting_ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerCasting = typeof partnerCastings.$inferSelect;
export type NewPartnerCasting = typeof partnerCastings.$inferInsert;

// One submission per brand per casting (table name says "video", brandId
// says "whose" — a brand can't flood a casting with multiple entries).
export const castingSubmissions = pgTable(
  "casting_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    castingId: uuid("casting_id")
      .notNull()
      .references(() => partnerCastings.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    videoUrl: text("video_url").notNull(),
    // Phase 41: same fields as a Solo-Pitch/Creator-Video — nullable so no
    // backfill is needed for submissions posted before this existed.
    description: text("description"),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    // Phase 46: siehe soloPitches.containsAiContent.
    containsAiContent: boolean("contains_ai_content").notNull().default(false),
    // RN-7 (Luca 30.09.): neue Einreichungen laufen zusätzlich als Solo-Pitch
    // im Feed (mit Knopf „Zum Casting“). Löscht die Marke den Post, fällt
    // auch die Einreichung weg. Null bei älteren Einreichungen.
    soloPitchId: uuid("solo_pitch_id").references(() => soloPitches.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("casting_submissions_casting_brand_unique_idx").on(table.castingId, table.brandId)],
);

export type CastingSubmission = typeof castingSubmissions.$inferSelect;
export type NewCastingSubmission = typeof castingSubmissions.$inferInsert;

// One vote per user per casting (not per submission) — voting for a second
// candidate in the same casting isn't "another opinion", it's changing
// your pick, which isn't offered here (same "one vote, no take-backs"
// spirit as votes on a Duell).
export const castingVotes = pgTable(
  "casting_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    castingId: uuid("casting_id")
      .notNull()
      .references(() => partnerCastings.id, { onDelete: "cascade" }),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => castingSubmissions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("casting_votes_casting_user_unique_idx").on(table.castingId, table.userId)],
);

export type CastingVote = typeof castingVotes.$inferSelect;
export type NewCastingVote = typeof castingVotes.$inferInsert;

// RN-7 (Luca 30.09.): Creator-Challenge — ersetzt die offenen Monats-Charts
// (creator_submissions/creator_votes bleiben nur als Altdaten stehen). Nur
// die Marke selbst eröffnet eine Challenge für einen Kalendermonat
// ("YYYY-MM"); Creator reichen einen normalen Solo-Pitch mit
// creatorChallengeId ein, die Rangliste sind dessen Likes, am Monatsende
// stehen die Top 3 („Creator Winner Oktober 2026").
export const creatorChallenges = pgTable(
  "creator_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("creator_challenges_brand_period_unique_idx").on(table.brandId, table.period)],
);

export type CreatorChallenge = typeof creatorChallenges.$inferSelect;

// Phase 20: Creator-Charts. Different idea from Partner-Casting above —
// that's a brand's open call to find a *new* partner; this is for
// *existing* partners: a creator posts the same promo video they'd post on
// Instagram/TikTok anyway, tagged to the brand it's about, and the
// community votes for the best one each calendar month. No submission-to-
// a-specific-call step, no app-declared "winner becomes partner" — just a
// monthly leaderboard the brand can look at and decide off-platform
// (bonus, shoutout, whatever) what to do with. `period` is a plain
// "YYYY-MM" string computed at post time — deliberately not a separate
// "round" table with explicit start/end: the calendar month a submission
// was posted in IS its round, so there's nothing to schedule or close.
export const creatorSubmissions = pgTable("creator_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  creatorBrandId: uuid("creator_brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  videoUrl: text("video_url").notNull(),
  // Phase 41: same fields a Solo-Pitch requires — Luca: "wenn es genau das
  // selbe Video sein wird was sie fertig auf Insta gepostet haben" [muss
  // es trotzdem eine Beschreibung/Beschriftung/Link haben, 1:1 wie ein
  // Solo-Pitch]. Nullable (like solo_pitches' own description/cta columns)
  // so no backfill is needed for submissions posted before this existed.
  description: text("description"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  // Phase 46: siehe soloPitches.containsAiContent.
  containsAiContent: boolean("contains_ai_content").notNull().default(false),
  period: text("period").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreatorSubmission = typeof creatorSubmissions.$inferSelect;
export type NewCreatorSubmission = typeof creatorSubmissions.$inferInsert;

// brandId/period are denormalized from the submission onto the vote row —
// needed right here, not just joinable, because the unique index enforcing
// "one vote per person per brand per month" has to be on this table's own
// columns.
export const creatorVotes = pgTable(
  "creator_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => creatorSubmissions.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("creator_votes_brand_period_user_unique_idx").on(table.brandId, table.period, table.userId)],
);

export type CreatorVote = typeof creatorVotes.$inferSelect;
export type NewCreatorVote = typeof creatorVotes.$inferInsert;

// Phase 24: moderation. One row per "someone flagged this" — same
// event-log philosophy as rate_limit_hits/brand_analytics_events.
// `targetType` + `targetId` is a loose (not foreign-keyed) pointer, same
// reasoning as likes/comments before they got dedicated columns per type:
// the set of reportable things (solo pitch, reaction, comment, a Duell
// side, a casting/creator-chart submission, a brand) is too varied for one
// FK, and reports must survive even if the reported content is later
// deleted by the same moderation flow that reads them.
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterUserId: uuid("reporter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 'solo_pitch' | 'reaction' | 'comment' | 'battle_a' | 'battle_b' | 'casting_submission' | 'creator_submission' | 'brand'
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  note: text("note"),
  // 'open' | 'resolved'
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

// Phase 26: Boost. A brand pays to give one of its own Solo-Pitches a
// temporary visibility bump in the "Für dich"-Feed-Ranking (see
// FOLLOW_BOOST/BOOST_MULTIPLIER in feed.ts) — the platform's first paid
// feature. No payment processor wired up yet (see CLAUDE-CODE-UEBERGABE.md):
// a request lands here as 'pending', Luca confirms payment happened
// off-platform (bank transfer/invoice for now) and activates it by hand via
// /admin/boosts. `priceCents` is stored per row (not read from a shared
// constant at render time) so a later price change never rewrites history.
export const boosts = pgTable("boosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  soloPitchId: uuid("solo_pitch_id")
    .notNull()
    .references(() => soloPitches.id, { onDelete: "cascade" }),
  priceCents: integer("price_cents").notNull(),
  // 'pending' | 'active' | 'rejected' — 'expired' is derived from
  // expiresAt at read time, not stored (same philosophy as battle-stage.ts).
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export type Boost = typeof boosts.$inferSelect;
export type NewBoost = typeof boosts.$inferInsert;
