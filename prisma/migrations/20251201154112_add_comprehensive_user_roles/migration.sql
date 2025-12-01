-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STANDARD', 'BUSINESS', 'INFLUENCER', 'FACT_CHECKER', 'BOT', 'GOVERNMENT', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChannelRole" AS ENUM ('MEMBER', 'MODERATOR', 'OWNER');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "role" "ChannelRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STANDARD';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
