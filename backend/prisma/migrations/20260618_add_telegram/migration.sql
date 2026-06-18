-- AddColumn telegram to UserPreference
ALTER TABLE "UserPreference" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "UserPreference" ADD COLUMN "receiveTelegramNotifications" BOOLEAN NOT NULL DEFAULT false;
