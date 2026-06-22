-- Reset completo: recria todas as tabelas do zero
-- Roda quando o banco foi zerado manualmente

CREATE TABLE IF NOT EXISTS "User" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "name"      TEXT,
    "verified"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");

CREATE TABLE IF NOT EXISTS "FavoriteTeam" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    CONSTRAINT "FavoriteTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id"                        TEXT NOT NULL,
    "userId"                    TEXT NOT NULL,
    "receiveDailyNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId");

CREATE TABLE IF NOT EXISTS "TeamReport" (
    "id"        TEXT NOT NULL,
    "teamName"  TEXT NOT NULL,
    "report"    TEXT NOT NULL,
    "news"      JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamReport_teamName_key" ON "TeamReport"("teamName");

CREATE TABLE IF NOT EXISTS "FootballMatch" (
    "id"                 TEXT NOT NULL,
    "date"               TIMESTAMP(3) NOT NULL,
    "championship"       TEXT NOT NULL,
    "homeTeam"           TEXT NOT NULL,
    "awayTeam"           TEXT NOT NULL,
    "status"             TEXT NOT NULL,
    "externalId"         TEXT,
    "homeScore"          INTEGER,
    "awayScore"          INTEGER,
    "homeFlag"           TEXT,
    "awayFlag"           TEXT,
    "predictedGoalsHome" DOUBLE PRECISION,
    "predictedGoalsAway" DOUBLE PRECISION,
    "predictedCards"     DOUBLE PRECISION,
    "predictedFouls"     DOUBLE PRECISION,
    "homeTactics"        JSONB,
    "awayTactics"        JSONB,
    "aiAnalysis"         TEXT,
    "shortInsight"       TEXT,
    CONSTRAINT "FootballMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FootballMatch_externalId_key" ON "FootballMatch"("externalId");
CREATE INDEX IF NOT EXISTS "FootballMatch_date_idx" ON "FootballMatch"("date");
CREATE INDEX IF NOT EXISTS "FootballMatch_championship_idx" ON "FootballMatch"("championship");

-- Foreign keys
ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FavoriteTeam" DROP CONSTRAINT IF EXISTS "FavoriteTeam_userId_fkey";
ALTER TABLE "FavoriteTeam" ADD CONSTRAINT "FavoriteTeam_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPreference" DROP CONSTRAINT IF EXISTS "UserPreference_userId_fkey";
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
