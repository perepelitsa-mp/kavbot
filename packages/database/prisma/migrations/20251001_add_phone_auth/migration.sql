-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tg_user_id" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "password" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "moderated_at" TIMESTAMP(3);
