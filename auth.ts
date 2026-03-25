import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log('[auth] signIn callback — email:', user.email);
      if (!user.email) return false;
      await connectDB();
      await User.findOneAndUpdate(
        { email: user.email },
        { email: user.email, name: user.name ?? '', image: user.image ?? '' },
        { upsert: true, new: true }
      );
      console.log('[auth] signIn — upsert utilisateur OK');
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        console.log('[auth] jwt callback — récupération _id pour', user.email);
        await connectDB();
        const dbUser = await User.findOne({ email: user.email }).lean() as { _id: unknown } | null;
        if (dbUser) {
          token.id = String(dbUser._id);
          console.log('[auth] jwt — token.id défini :', token.id);
        } else {
          console.warn('[auth] jwt — utilisateur introuvable en base pour', user.email);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        (session.user as typeof session.user & { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
