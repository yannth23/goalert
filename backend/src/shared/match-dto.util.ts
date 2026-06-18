import { translateTeam } from '../football-match/translation.util';

/** The public match DTO returned to the frontend. */
export interface MatchDto {
  id: string;
  date: Date;
  championship: string;
  team1: string;
  team2: string;
  status: string;
  team1Score?: number;
  team2Score?: number;
  externalId?: string;
}

interface PrismaMatch {
  id: string;
  date: Date;
  championship: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  externalId: string | null;
}

/** Maps a Prisma FootballMatch row to the frontend DTO. */
export function mapMatchToDto(m: PrismaMatch): MatchDto {
  return {
    id: m.id,
    date: m.date,
    championship: m.championship,
    team1: translateTeam(m.homeTeam),
    team2: translateTeam(m.awayTeam),
    status: m.status,
    team1Score: m.homeScore ?? undefined,
    team2Score: m.awayScore ?? undefined,
    externalId: m.externalId ?? undefined,
  };
}
