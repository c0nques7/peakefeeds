/*
  Warnings:

  - The `status` column on the `SupportTicket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_UPDATE';

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "ticketId" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "priority" "SupportPriority" NOT NULL DEFAULT 'LOW',
DROP COLUMN "status",
ADD COLUMN     "status" "SupportStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_assigneeId_idx" ON "SupportTicket"("assigneeId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
