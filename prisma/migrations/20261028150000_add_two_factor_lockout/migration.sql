-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "twoFactorLockedUntil" TIMESTAMP(3);
