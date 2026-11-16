import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { logAuthFailure } from '@/lib/auth/monitoring';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  logger: {
    error: logAuthFailure,
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;

      return session;
    },
  },
});
