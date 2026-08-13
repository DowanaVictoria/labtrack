import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";

// Keyed by email, not IP: the goal is to stop a specific account being
// brute-forced, which matters regardless of how many IPs an attacker has.
const loginLimiter = createRateLimiter(5, 15 * 60 * 1000);

// Login is identity resolution, not tenant data access: email is unique
// platform-wide, so this is the one legitimate place to query `User` on the
// base client rather than through tenant-scope.ts (docs/System_Design.md §2).
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        // Rate-limited attempts fail exactly like wrong credentials — never
        // signal to the caller that throttling kicked in specifically.
        if (loginLimiter.isLimited(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          loginLimiter.recordFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          loginLimiter.recordFailure(email);
          return null;
        }

        loginLimiter.reset(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          labId: user.labId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.labId = user.labId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.labId = token.labId;
      return session;
    },
  },
});
