import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import Link from 'next/link';
import { signOut, useSession, SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/router';

import { canEditRole } from '@/types/auth';

type AppContentProps = Pick<AppProps, 'Component' | 'pageProps'>;

function AppContent({ Component, pageProps }: AppContentProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoginPage = router.pathname === '/auth/login';
  const requiresEditorRole = [
    '/initiatives/new',
    '/initiatives/[id]/edit',
    '/initiatives/[id]/progress/new',
  ].includes(router.pathname);

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      const callbackUrl = encodeURIComponent(router.asPath);
      router.replace(`/auth/login?callbackUrl=${callbackUrl}`);
      return;
    }

    if (status === 'authenticated' && requiresEditorRole && !canEditRole(session?.user.role)) {
      router.replace('/initiatives');
    }
  }, [status, isLoginPage, requiresEditorRole, session?.user.role, router]);

  if (!isLoginPage && status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }

  if (!isLoginPage && status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      {session?.user && !isLoginPage && (
        <header className="border-b bg-white px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link href="/initiatives" className="font-semibold text-gray-800">
              Plan Monitoring
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-700">
                {session.user.displayName || session.user.email} ({session.user.role})
              </span>
              <button
                type="button"
                className="rounded border px-3 py-1 hover:bg-gray-100"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>
      )}
      <Component {...pageProps} />
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <AppContent Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}
