import { translateTeam } from '../football-match/translation.util';

/** The public match DTO returned to the frontend. */
export interface MatchDto {
  id: string;
  date: Date;
  championship: string;
  team1: string;
  team2: string;
  team1Flag?: string;
  team2Flag?: string;
  status: string;
  team1Score?: number;
  team2Score?: number;
  externalId?: string;
  predictions?: {
    goalsHome: number;
    goalsAway: number;
    cards: number;
    fouls: number;
  };
  tactics?: {
    home: any;
    away: any;
  };
  aiAnalysis?: string;
  // shortInsight?: string;
}

interface PrismaMatch {
  id: string;
  date: Date;
  championship: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  externalId: string | null;
  predictedGoalsHome: number | null;
  predictedGoalsAway: number | null;
  predictedCards: number | null;
  predictedFouls: number | null;
  homeTactics: any;
  awayTactics: any;
  aiAnalysis: string | null;
  // shortInsight: string | null;
}

/** Maps a Prisma FootballMatch row to the frontend DTO. */
export function mapMatchToDto(m: PrismaMatch): MatchDto {
  return {
    id: m.id,
    date: m.date,
    championship: m.championship,
    team1: translateTeam(m.homeTeam),
    team2: translateTeam(m.awayTeam),
    team1Flag: m.homeFlag ?? undefined,
    team2Flag: m.awayFlag ?? undefined,
    status: m.status,
    team1Score: m.homeScore ?? undefined,
    team2Score: m.awayScore ?? undefined,
    externalId: m.externalId ?? undefined,
    predictions: m.predictedGoalsHome !== null ? {
      goalsHome: m.predictedGoalsHome ?? 0,
      goalsAway: m.predictedGoalsAway ?? 0,
      cards: m.predictedCards ?? 0,
      fouls: m.predictedFouls ?? 0,
    } : undefined,
    tactics: m.homeTactics ? {
      home: m.homeTactics,
      away: m.awayTactics,
    } : undefined,
    aiAnalysis: m.aiAnalysis ?? undefined,
    // shortInsight: m.shortInsight ?? undefined,
  } as any;
}
