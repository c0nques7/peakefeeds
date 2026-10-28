-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "clientKey" TEXT;

-- CreateIndex
CREATE INDEX "SupportTicket_clientKey_createdAt_idx" ON "SupportTicket"("clientKey", "createdAt");
