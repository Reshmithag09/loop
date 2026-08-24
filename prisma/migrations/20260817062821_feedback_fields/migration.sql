/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Feedback` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "imageUrl",
DROP COLUMN "text",
ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "customerLabel" TEXT,
ADD COLUMN     "sentimentScore" DOUBLE PRECISION,
ADD COLUMN     "sourceRef" TEXT;
