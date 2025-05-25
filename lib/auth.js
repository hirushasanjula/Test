// lib/auth.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";

export const { handlers, auth, signIn, signOut } = NextAuth({
   trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Authorize: Missing email or password");
          return null;
        }

        try {
          await connectDB();
          console.log("Authorize: Finding user with email:", credentials.email);
          const user = await User.findOne({ email: credentials.email })
            .populate("companyId", "name")
            .lean();

          if (!user) {
            console.log("Authorize: User not found");
            return null;
          }

          const userWithMethods = await User.findOne({ email: credentials.email });
          if (!(await userWithMethods.comparePassword(credentials.password))) {
            console.log("Authorize: Invalid password");
            return null;
          }

          const authUser = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId?._id.toString() || null,
            companyName: user.companyId?.name || "Unknown",
          };
          console.log("Authorize: Returning user:", authUser);
          return authUser;
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signUp: "/register",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        console.log("JWT callback: Token updated:", token);
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback: Token:", token);
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id || token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
      }
      console.log("Session callback: Session updated:", session);
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});