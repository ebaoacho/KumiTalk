-- CreateEnum
CREATE TYPE "FinalModelStatus" AS ENUM ('idle', 'processing', 'ready', 'failed');

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "final_model_glb_url" TEXT,
ADD COLUMN     "final_model_status" "FinalModelStatus" NOT NULL DEFAULT 'idle';
