import bcrypt from 'bcrypt';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import prisma from '@/lib/prisma';
import { AppRole, isAppRole } from '@/types/auth';

const normalizeRole = (role?: string | null): AppRole => {
  if (role && isAppRole(role)) {
    return role;
  }

  return 'viewer';
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Email Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.appUser.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: normalizeRole(user.role),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.role = user.role;
        token.displayName = user.displayName;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? 0;
        session.user.role = normalizeRole(token.role);
        session.user.displayName = token.displayName;
      }

      return session;
    },
  },
};
