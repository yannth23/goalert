export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface FavoriteTeam {
  id: string;
  userId: string;
  teamName: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  receiveDailyNotifications: boolean;
}

export interface FootballMatch {
  id: string;
  date: string;
  championship: string;
  team1: string;
  team2: string;
  status: string;
  team1Score?: number;
  team2Score?: number;
  externalId?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface StandingEntry {
  position: number;
  teamId: number;
  teamName: string;
  crest: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface GroupStanding {
  group: string;
  table: StandingEntry[];
}

// Mantido para compatibilidade com componentes existentes
export type Standing = StandingEntry;

export interface Scorer {
  playerId: number;
  playerName: string;
  teamName: string;
  goals: number;
  assists: number;
}
