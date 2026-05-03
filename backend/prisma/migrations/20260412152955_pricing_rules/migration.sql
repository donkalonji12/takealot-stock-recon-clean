-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "tsn" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "targetMargin" DOUBLE PRECISION,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_sellerAccountId_tsn_key" ON "PricingRule"("sellerAccountId", "tsn");

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
