CREATE TABLE "access_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "emailSnapshot" TEXT,
    "displayNameSnapshot" TEXT,
    "roleSnapshot" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "statusCode" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "access_logs_createdAt_idx" ON "access_logs"("createdAt");
CREATE INDEX "access_logs_userId_idx" ON "access_logs"("userId");
CREATE INDEX "access_logs_path_idx" ON "access_logs"("path");
CREATE INDEX "access_logs_routeType_idx" ON "access_logs"("routeType");

ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
