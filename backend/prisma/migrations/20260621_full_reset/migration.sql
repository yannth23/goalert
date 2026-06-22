-- Reset completo: dropa e recria todas as tabelas com schema atual

-- Drop tudo na ordem certa (FK primeiro)
DROP TABLE IF EXISTS "FootballMatch" CASCADE;
DROP TABLE IF EXISTS "FavoriteTeam" CASCADE;
DROP TABLE IF EXISTS "RefreshToken" CASCADE;
DROP TABLE IF EXISTS "UserPreference" CASCADE;
DROP TABLE IF EXISTS "TeamReport" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- User
CREATE TABLE "User" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "name"      TEXT,
    "verified"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- RefreshToken
CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FavoriteTeam
CREATE TABLE "FavoriteTeam" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    CONSTRAINT "FavoriteTeam_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "FavoriteTeam" ADD CONSTRAINT "FavoriteTeam_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPreference
CREATE TABLE "UserPreference" (
    "id"                        TEXT NOT NULL,
    "userId"                    TEXT NOT NULL,
    "receiveDailyNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TeamReport
CREATE TABLE "TeamReport" (
    "id"        TEXT NOT NULL,
    "teamName"  TEXT NOT NULL,
    "report"    TEXT NOT NULL,
    "news"      JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamReport_teamName_key" ON "TeamReport"("teamName");

-- FootballMatch (schema completo)
CREATE TABLE "FootballMatch" (
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
CREATE UNIQUE INDEX "FootballMatch_externalId_key" ON "FootballMatch"("externalId");
CREATE INDEX "FootballMatch_date_idx" ON "FootballMatch"("date");
CREATE INDEX "FootballMatch_championship_idx" ON "FootballMatch"("championship");
