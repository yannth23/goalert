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
  gameDominanceProb: number; // 0-100: quanto este time domina o jogo
  expectedGoals?: number;
  advancedStats?: {
    passesProgressive: number;
    pressingEfficiency: number;
    deepCompletions: number;
  };
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
  shortInsight?: string;
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

export interface TeamReportProfile {
  formation: string;
  keyPlayer: string;
  intensity: number;
  dominanceStyle: 'possession' | 'counter' | 'pressing' | 'defensive';
  description: string;
}

export interface TeamReportStatistics {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  averageGoalsPerMatch: number;
  averageXG: number;
}

export interface TeamReportMatch {
  date: string;
  opponent: string;
  result: string;
  score: string;
  tactics: string;
}

export interface TeamReportWebInsights {
  recentNews: string[];
  pressAnalysis: string;
  teamSentiment: string;
}

export interface TeamReport {
  teamName: string;
  lastUpdated: string;
  profile: TeamReportProfile;
  statistics: TeamReportStatistics;
  recentMatches: TeamReportMatch[];
  webInsights: TeamReportWebInsights;
  aiAnalysis: string;
}
