-- CreateEnum
CREATE TYPE "AdminLogType" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'USER_UPDATE', 'USER_DELETE', 'CONTENT_LOCK', 'CONTENT_UNLOCK', 'REPORT_RESOLVE', 'CONFIG_CHANGE', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "eventType" "AdminLogType" NOT NULL,
    "targetResource" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminLog_eventType_idx" ON "AdminLog"("eventType");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
