-- AlterTable
ALTER TABLE "UserPreference"
  ADD COLUMN "whatsappNumber" TEXT,
  ADD COLUMN "receiveWhatsappNotifications" BOOLEAN NOT NULL DEFAULT false;
