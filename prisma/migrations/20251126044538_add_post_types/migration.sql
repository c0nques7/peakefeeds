-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'LINK');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "mediaHash" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'TEXT';
