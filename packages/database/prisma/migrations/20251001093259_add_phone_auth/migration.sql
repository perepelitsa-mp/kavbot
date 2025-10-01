/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_category_id_fkey";

-- DropIndex
DROP INDEX "documents_embedding_idx";

-- DropIndex
DROP INDEX "listings_embedding_idx";

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "moderated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "tg_user_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "documents_title_gin_idx" RENAME TO "documents_title_idx";

-- RenameIndex
ALTER INDEX "listings_title_gin_idx" RENAME TO "listings_title_idx";
