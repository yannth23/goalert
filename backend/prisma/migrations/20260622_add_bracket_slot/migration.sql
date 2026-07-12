-- CreateTable
CREATE TABLE "BracketSlot" (
    "id"         TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "phase"      TEXT NOT NULL,
    "homeSlot"   TEXT NOT NULL,
    "awaySlot"   TEXT NOT NULL,
    "homeTeam"   TEXT,
    "awayTeam"   TEXT,
    "matchId"    TEXT,
    "homeScore"  INTEGER,
    "awayScore"  INTEGER,
    "status"     TEXT NOT NULL DEFAULT 'PENDING',
    "winner"     TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BracketSlot_gameNumber_key" ON "BracketSlot"("gameNumber");
CREATE UNIQUE INDEX "BracketSlot_matchId_key" ON "BracketSlot"("matchId");
CREATE INDEX "BracketSlot_phase_idx" ON "BracketSlot"("phase");
