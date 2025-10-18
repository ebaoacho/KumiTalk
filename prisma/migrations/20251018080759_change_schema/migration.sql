/*
  Warnings:

  - You are about to drop the column `furniture_id` on the `chats` table. All the data in the column will be lost.
  - Added the required column `document_id` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `documents` required. This step will fail if there are existing NULL values in that column.
  - Made the column `chat_id` on table `messages` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."chats" DROP CONSTRAINT "chats_furniture_id_fkey";

-- DropIndex
DROP INDEX "public"."chats_furniture_id_idx";

-- DropIndex
DROP INDEX "public"."documents_user_id_idx";

-- DropIndex
DROP INDEX "public"."messages_chat_id_idx";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "furniture_id",
ADD COLUMN     "document_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "chat_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
