-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "canComment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canDeletePosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPinPosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPost" BOOLEAN NOT NULL DEFAULT true;
