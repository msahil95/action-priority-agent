import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertUser } from "../../../lib/supabase";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      // Fire-and-forget: logs the user for the stats page, never blocks login
      upsertUser(user.email, user.name).catch(() => {});
    },
  },
  callbacks: {
    // Keep the Google access token around so API routes can call Calendar
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
