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

export interface TacticalAnalysis {
  formation: string;
  lineup: string[];
  keyPlayer: string;
  intensity: number;
  dominanceStyle: 'possession' | 'counter' | 'pressing' | 'defensive' | 'balanced';
  dominanceDescription: string;
  heatmapData: { x: number; y: number; value: number }[];
}

export interface FootballMatch {
  id: string;
  date: string;
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
    home: TacticalAnalysis;
    away: TacticalAnalysis;
  };
  aiAnalysis?: string;
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

export type Standing = StandingEntry;

export interface Scorer {
  playerId: number;
  playerName: string;
  teamName: string;
  goals: number;
  assists: number;
}
