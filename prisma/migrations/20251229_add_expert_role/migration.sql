-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EXPERT';

-- CreateIndex
CREATE INDEX "TicketMessage_adminId_idx" ON "TicketMessage"("adminId");

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

