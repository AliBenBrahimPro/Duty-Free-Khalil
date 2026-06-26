-- AlterTable
ALTER TABLE "RequestComment" ADD COLUMN     "audio" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
