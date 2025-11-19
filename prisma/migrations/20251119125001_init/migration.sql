-- CreateTable
CREATE TABLE "initiatives" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "measureName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "detail" TEXT,
    "goal" TEXT,
    "kpi" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "department" TEXT,
    "scheduleText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_logs" (
    "id" SERIAL NOT NULL,
    "initiativeId" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalQuarter" INTEGER NOT NULL,
    "progressStatus" TEXT,
    "progressEvaluation" TEXT,
    "nextAction" TEXT,
    "nextActionDueDate" TIMESTAMP(3),
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "department" TEXT,
    "role" TEXT NOT NULL DEFAULT 'editor',

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- AddForeignKey
ALTER TABLE "progress_logs" ADD CONSTRAINT "progress_logs_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
