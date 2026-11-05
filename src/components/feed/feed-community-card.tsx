"use client";

import { useMemo } from "react";
import type { FeedReaction } from "@/lib/community-feed";
import type { ReactionRow } from "@/lib/reaction-threads";
import { ReactionFeedCard } from "@/components/pitches/reaction-feed-card";

/**
 * Luca 05.11.: Community-Reaktionen und Challenge-Beiträge von Zuschauern im
 * „Für dich“-Feed der Website — wie in der App (MarkItch-mobile
 * components/feed/feed-reaction-card.tsx). Nutzt die Karte der Reaktions-Ansicht.
 */
export function FeedCommunityCard({
  item,
  isLoggedIn,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onShare,
  onActive,
}: {
  item: FeedReaction;
  isLoggedIn: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (item: FeedReaction) => void;
  onOpenComments: (reactionId: string) => void;
  onShare: (item: FeedReaction) => void;
  onActive: () => void;
}) {
  const reaction = useMemo<ReactionRow>(
    () => ({
      id: item.reactionId,
      soloPitchId: item.soloPitchId,
      creatorChallengeId: item.creatorChallengeId,
      parentReactionId: item.parentReactionId,
      brandId: null,
      userId: item.authorUserId,
      videoUrl: item.videoUrl,
      promotedToBattleId: null,
      containsAiContent: item.containsAiContent,
      createdAt: item.createdAt,
      brand: null,
      community: { userId: item.authorUserId, name: item.authorName },
      likeCount: item.likeCount,
      viewerLiked: item.viewerLiked,
      commentCount: item.commentCount,
      trim: item.trim,
      music: item.music,
      thumbnailUrl: item.thumbnailUrl,
      viewerIsOwner: item.viewerIsAuthor,
    }),
    [item],
  );
  const challenge = !item.soloPitchId;
  return (
    <ReactionFeedCard
      reaction={reaction}
      isLoggedIn={isLoggedIn}
      canPromote={false}
      canReply={false}
      muted={muted}
      onToggleMute={onToggleMute}
      onToggleLike={() => onToggleLike(item)}
      onReply={() => {}}
      onOpenComments={onOpenComments}
      onShare={() => onShare(item)}
      onActive={onActive}
      feedContext={
        challenge
          ? { label: `Challenge von ${item.original.brandName}`, href: `/challenges/${item.creatorChallengeId}`, linkLabel: "Zur Challenge" }
          : {
              label: `${item.parentReactionId ? "Antwort" : "Reaktion"} auf ${item.original.brandName}`,
              href: `/?pitch=${item.soloPitchId}`,
              linkLabel: "Original ansehen",
            }
      }
    />
  );
}
