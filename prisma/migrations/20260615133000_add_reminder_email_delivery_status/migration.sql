ALTER TABLE "reminder_email_logs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE "reminder_email_logs" ADD COLUMN "provider" TEXT;
ALTER TABLE "reminder_email_logs" ADD COLUMN "providerMessageId" TEXT;
ALTER TABLE "reminder_email_logs" ADD COLUMN "errorMessage" TEXT;
