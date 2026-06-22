-- Adiciona colunas faltantes na FootballMatch
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "homeFlag"           TEXT;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "awayFlag"           TEXT;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "predictedGoalsHome" DOUBLE PRECISION;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "predictedGoalsAway" DOUBLE PRECISION;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "predictedCards"     DOUBLE PRECISION;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "predictedFouls"     DOUBLE PRECISION;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "homeTactics"        JSONB;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "awayTactics"        JSONB;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "aiAnalysis"         TEXT;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "shortInsight"       TEXT;
ALTER TABLE "FootballMatch" ADD COLUMN IF NOT EXISTS "externalId"         TEXT;

-- Cria índices e unique se não existirem
CREATE UNIQUE INDEX IF NOT EXISTS "FootballMatch_externalId_key" ON "FootballMatch"("externalId");
CREATE INDEX IF NOT EXISTS "FootballMatch_date_idx" ON "FootballMatch"("date");
CREATE INDEX IF NOT EXISTS "FootballMatch_championship_idx" ON "FootballMatch"("championship");

-- TeamReport se não existir
CREATE TABLE IF NOT EXISTS "TeamReport" (
    "id"        TEXT NOT NULL,
    "teamName"  TEXT NOT NULL,
    "report"    TEXT NOT NULL,
    "news"      JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamReport_teamName_key" ON "TeamReport"("teamName");
