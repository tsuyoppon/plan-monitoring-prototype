import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

import { AppRole } from '@/types/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role: AppRole;
      displayName?: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: number;
    role: AppRole;
    displayName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: number;
    role?: AppRole;
    displayName?: string | null;
  }
}
