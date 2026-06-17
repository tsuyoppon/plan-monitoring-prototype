import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { Session } from 'next-auth';

import { getApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export type AccessRouteType = 'page' | 'api';

type AccessLogInput = {
  req: NextApiRequest;
  session?: Session | null;
  method?: string;
  path: string;
  routeType: AccessRouteType;
  statusCode?: number;
};

const getHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const getClientIp = (req: NextApiRequest) => {
  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return req.socket.remoteAddress ?? null;
};

const normalizePath = (path: string) => {
  try {
    return new URL(path, 'http://localhost').pathname;
  } catch {
    return path.split('?')[0] || path;
  }
};

export const shouldSkipAccessLog = (path: string) => {
  const normalizedPath = normalizePath(path);

  return (
    normalizedPath.startsWith('/api/auth') ||
    normalizedPath.startsWith('/api/access-log') ||
    normalizedPath.startsWith('/_next') ||
    normalizedPath === '/favicon.ico' ||
    normalizedPath === '/api/hello'
  );
};

export const recordAccessLog = async ({
  req,
  session,
  method,
  path,
  routeType,
  statusCode,
}: AccessLogInput) => {
  if (shouldSkipAccessLog(path)) {
    return;
  }

  try {
    await prisma.accessLog.create({
      data: {
        userId: session?.user.id || null,
        emailSnapshot: session?.user.email ?? null,
        displayNameSnapshot: session?.user.displayName ?? null,
        roleSnapshot: session?.user.role ?? null,
        method: method ?? req.method ?? 'GET',
        path,
        routeType,
        statusCode: statusCode ?? null,
        userAgent: getHeaderValue(req.headers['user-agent']) ?? null,
        ipAddress: getClientIp(req),
        referer: getHeaderValue(req.headers.referer) ?? null,
      },
    });
  } catch (error) {
    console.warn('Failed to record access log', error);
  }
};

export const withAccessLogging = (handler: NextApiHandler): NextApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const path = req.url ?? req.query?.toString?.() ?? '';
    const session = await getApiSession(req, res).catch(() => null);

    try {
      await handler(req, res);
    } catch (error) {
      await recordAccessLog({
        req,
        session,
        path,
        routeType: 'api',
        statusCode: res.statusCode >= 400 ? res.statusCode : 500,
      });
      throw error;
    }

    await recordAccessLog({
      req,
      session,
      path,
      routeType: 'api',
      statusCode: res.statusCode,
    });
  };
};
