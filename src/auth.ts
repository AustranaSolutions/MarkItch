import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPasswordOrDummy } from "@/lib/password";
import { LoginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export const LOGIN_RATE_LIMITED = "rate_limited";

/** Sicherheits-Check 19.11.: zu viele Login-Versuche (pro IP oder pro E-Mail, wie in der App). */
class LoginRateLimited extends CredentialsSignin {
  code = LOGIN_RATE_LIMITED;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (rawCredentials, request) => {
        const parsed = LoginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Gilt auch für direkte Aufrufe von /api/auth/callback/credentials (nicht nur das Formular).
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!(await checkRateLimit("login", ip)).allowed) throw new LoginRateLimited();
        if (!(await checkRateLimit("login-email", email.trim().toLowerCase())).allowed) throw new LoginRateLimited();

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        // Auch ohne Konto rechnen (gleiche Antwortzeit, siehe verifyPasswordOrDummy).
        const valid = await verifyPasswordOrDummy(password, user?.passwordHash);
        if (!user || !valid) return null;

        // Phase 24: a banned account can't log back in — the generic
        // "E-Mail oder Passwort ist falsch" message loginUser shows for any
        // authorize() failure covers this too, deliberately (no need to
        // reveal ban status to someone who no longer has a session).
        if (user.bannedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isVerified: user.emailVerifiedAt !== null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isVerified = user.isVerified;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
});
