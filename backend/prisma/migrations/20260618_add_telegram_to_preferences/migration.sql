-- AlterTable
ALTER TABLE "UserPreference"
  DROP COLUMN IF EXISTS "whatsappNumber",
  DROP COLUMN IF EXISTS "receiveWhatsappNotifications",
  ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
  ADD COLUMN IF NOT EXISTS "receiveTelegramNotifications" BOOLEAN NOT NULL DEFAULT false;
