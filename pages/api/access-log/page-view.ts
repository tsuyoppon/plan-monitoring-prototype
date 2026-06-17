import type { NextApiRequest, NextApiResponse } from 'next';

import { recordAccessLog } from '@/lib/accessLogging';
import { requireAuth } from '@/lib/auth';

type ApiError = {
  error: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | ApiError>) {
  const session = await requireAuth(req, res);
  if (!session) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const { path } = req.body ?? {};
  if (typeof path !== 'string' || !path.startsWith('/')) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  await recordAccessLog({
    req,
    session,
    method: 'GET',
    path,
    routeType: 'page',
    statusCode: 200,
  });

  res.status(200).json({ ok: true });
}
