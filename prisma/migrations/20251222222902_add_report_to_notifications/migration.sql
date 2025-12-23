-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPORT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "reportId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_reportId_idx" ON "Notification"("reportId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
