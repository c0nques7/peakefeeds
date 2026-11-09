/*
  Warnings:

  - You are about to drop the `AdView` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdView" DROP CONSTRAINT "AdView_userId_fkey";

-- AlterTable
ALTER TABLE "_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ConversationParticipants_AB_unique";

-- DropTable
DROP TABLE "AdView";
