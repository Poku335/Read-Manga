import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { log } from "./logger";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.email?.split("@")[0] ?? "User",
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request?.headers?.get("x-real-ip") ??
          undefined;
        const userAgent = request?.headers?.get("user-agent") ?? undefined;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          await log({ type: "AUTH", action: "sign_in_failed", meta: { reason: "user_not_found" }, ip, userAgent });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          await log({ userId: user.id, type: "AUTH", action: "sign_in_failed", meta: { reason: "wrong_password" }, ip, userAgent });
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          coins: user.coins,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user?.id) return;
      await log({
        userId: parseInt(user.id),
        type: "AUTH",
        action: isNewUser ? "sign_up" : "sign_in_success",
        meta: { provider: account?.provider ?? "credentials" },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // OAuth providers may not populate user.role — fetch from DB to ensure accuracy
        if (!user.role && user.email) {
          const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
          if (dbUser) {
            token.role = dbUser.role;
            token.coins = dbUser.coins;
          } else {
            token.role = "USER";
            token.coins = 0;
          }
        } else {
          token.role = (user.role as string) ?? "USER";
          token.coins = (user.coins as number) ?? 0;
        }
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id.toString();
          token.role = dbUser.role;
          token.coins = dbUser.coins;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role = token.role;
        session.user.coins = token.coins;
      }
      return session;
    },
  },
});
