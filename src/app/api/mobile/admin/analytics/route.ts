import { NextResponse } from "next/server";
import {
  getActiveBrandsStats,
  getCtaStats,
  getReferralStats,
  getRetention,
  getVideosPerSessionStats,
  getVisitorStats,
  getVoteFunnel,
} from "@/lib/platform-analytics";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 11.10.: Plattform-Zahlen in der App — dieselben wie /admin/analytics.
export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const [visitors, videosPerSession, retention, cta, voteFunnel, referrals, brands] = await Promise.all([
    getVisitorStats(30),
    getVideosPerSessionStats(14),
    getRetention(),
    getCtaStats(30),
    getVoteFunnel(30),
    getReferralStats(30),
    getActiveBrandsStats(),
  ]);
  return NextResponse.json({ visitors, videosPerSession, retention, cta, voteFunnel, referrals, brands });
}
