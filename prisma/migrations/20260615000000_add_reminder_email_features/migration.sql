CREATE TABLE "reminder_email_settings" (
    "id" SERIAL NOT NULL,
    "introText" TEXT NOT NULL,
    "closingText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_email_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reminder_email_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "initiativeId" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentByUserId" INTEGER,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_email_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reminder_email_logs" ADD CONSTRAINT "reminder_email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reminder_email_logs" ADD CONSTRAINT "reminder_email_logs_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reminder_email_logs" ADD CONSTRAINT "reminder_email_logs_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
