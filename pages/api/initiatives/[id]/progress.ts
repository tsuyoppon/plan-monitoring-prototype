import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@/generated/client/client';
import prisma from '@/lib/prisma';
import { normalizeProgressLogInput, validateProgressLog } from '@/lib/progressValidation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const initiativeId = parseInt(id as string);

  if (isNaN(initiativeId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'GET') {
    try {
      const progressLogs = await prisma.progressLog.findMany({
        where: { initiativeId },
        orderBy: [
          { fiscalYear: 'desc' },
          { fiscalQuarter: 'desc' },
          { versionNo: 'desc' },
        ],
      });
      res.status(200).json(progressLogs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch progress logs' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        fiscalYear,
        fiscalQuarter,
        progressStatus,
        progressEvaluation,
        nextAction,
        nextActionDueDate,
      } = normalizeProgressLogInput(req.body);
      const validationErrors = validateProgressLog({
        fiscalYear,
        fiscalQuarter,
        progressStatus,
        progressEvaluation,
        nextAction,
        nextActionDueDate,
      });
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      // トランザクションで処理
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. 同一年度・四半期の既存ログを取得し、isLatest=false に更新
        //    また、最新の versionNo を取得してインクリメントする準備
        const existingLogs = await tx.progressLog.findMany({
          where: {
            initiativeId,
            fiscalYear,
            fiscalQuarter,
          },
          orderBy: { versionNo: 'desc' },
        });

        let nextVersionNo = 1;
        if (existingLogs.length > 0) {
          nextVersionNo = existingLogs[0].versionNo + 1;
          
          // 既存の isLatest=true のものを false にする
          await tx.progressLog.updateMany({
            where: {
              initiativeId,
              fiscalYear,
              fiscalQuarter,
              isLatest: true,
            },
            data: { isLatest: false },
          });
        }

        // 2. 新しいログを作成
        const newLog = await tx.progressLog.create({
          data: {
            initiativeId,
            fiscalYear,
            fiscalQuarter,
            progressStatus,
            progressEvaluation,
            nextAction,
            nextActionDueDate: nextActionDueDate ? new Date(nextActionDueDate) : null,
            versionNo: nextVersionNo,
            isLatest: true,
          },
        });

        return newLog;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create progress log' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { logId, ...rawBody } = req.body ?? {};
      const progressLogId = Number(logId);
      if (!Number.isInteger(progressLogId)) {
        return res.status(400).json({ error: 'Invalid log ID' });
      }
      const {
        fiscalYear,
        fiscalQuarter,
        progressStatus,
        progressEvaluation,
        nextAction,
        nextActionDueDate,
      } = normalizeProgressLogInput(rawBody);
      const validationErrors = validateProgressLog({
        fiscalYear,
        fiscalQuarter,
        progressStatus,
        progressEvaluation,
        nextAction,
        nextActionDueDate,
      });
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      const existingLog = await prisma.progressLog.findFirst({
        where: { id: progressLogId, initiativeId },
      });
      if (!existingLog) {
        return res.status(404).json({ error: 'Progress log not found' });
      }

      const updatedLog = await prisma.progressLog.update({
        where: { id: progressLogId },
        data: {
          fiscalYear,
          fiscalQuarter,
          progressStatus,
          progressEvaluation,
          nextAction,
          nextActionDueDate: nextActionDueDate ? new Date(nextActionDueDate) : null,
        },
      });

      res.status(200).json(updatedLog);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update progress log' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
