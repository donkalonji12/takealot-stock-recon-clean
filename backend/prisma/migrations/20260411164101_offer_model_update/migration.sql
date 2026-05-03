/*
  Warnings:

  - A unique constraint covering the columns `[sellerAccountId,offerId]` on the table `Offer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `offerId` on table `Offer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Offer_sellerAccountId_tsn_key";

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "stock" INTEGER,
ALTER COLUMN "tsn" DROP NOT NULL,
ALTER COLUMN "offerId" SET NOT NULL,
ALTER COLUMN "price" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Offer_sellerAccountId_offerId_key" ON "Offer"("sellerAccountId", "offerId");
