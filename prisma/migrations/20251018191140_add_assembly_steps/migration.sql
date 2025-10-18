-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "step_index" INTEGER;

-- CreateTable
CREATE TABLE "assembly_steps" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "step_index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageBase64" TEXT,
    "parts" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assembly_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assembly_steps_chat_id_step_index_key" ON "assembly_steps"("chat_id", "step_index");

-- AddForeignKey
ALTER TABLE "assembly_steps" ADD CONSTRAINT "assembly_steps_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
